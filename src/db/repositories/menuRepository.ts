import type {
  MenuCategory,
  MenuHead,
  MenuOffer,
  MenuProduct,
  ProductHeadMapping,
  TaxRate,
} from '../../types/product';
import type {Transaction} from '@op-engineering/op-sqlite';
import {clearAllMenuTables, getMenuDb} from '../menuDb';

export interface MenuSyncMeta {
  restaurantId: string;
  version: string | null;
  lastSyncedAt: string | null;
}

function parsePayload<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

function isActive(status: unknown): boolean {
  if (status === true) return true;
  if (status === false) return false;
  return String(status ?? 'Active') !== 'Inactive' && String(status) !== 'false';
}

export async function getSyncMeta(): Promise<MenuSyncMeta | null> {
  const db = await getMenuDb();
  const result = await db.execute(
    'SELECT restaurant_id, version, last_synced_at FROM menu_sync_meta WHERE id = 1',
  );
  const row = result.rows?.[0];
  if (!row) return null;
  return {
    restaurantId: String(row.restaurant_id ?? ''),
    version: row.version != null ? String(row.version) : null,
    lastSyncedAt:
      row.last_synced_at != null ? String(row.last_synced_at) : null,
  };
}

export async function setSyncMeta(
  restaurantId: string,
  version: string,
  lastSyncedAt: string,
  tx?: Transaction,
): Promise<void> {
  const runner = tx ?? (await getMenuDb());
  await runner.execute(
    `INSERT INTO menu_sync_meta (id, restaurant_id, version, last_synced_at, updated_at)
     VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       restaurant_id = excluded.restaurant_id,
       version = excluded.version,
       last_synced_at = excluded.last_synced_at,
       updated_at = excluded.updated_at`,
    [restaurantId, version, lastSyncedAt, new Date().toISOString()],
  );
}

export async function clearMenuForRestaurantChange(
  restaurantId: string,
): Promise<void> {
  const db = await getMenuDb();
  const meta = await getSyncMeta();
  if (meta && meta.restaurantId && meta.restaurantId !== restaurantId) {
    await clearAllMenuTables(db);
  }
}

async function upsertCategory(tx: Transaction, category: MenuCategory) {
  await tx.execute(
    `INSERT INTO categories (id, name, status, updated_at, payload_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       status = excluded.status,
       updated_at = excluded.updated_at,
       payload_json = excluded.payload_json`,
    [
      category.id,
      category.name,
      category.status ?? 'Active',
      (category as {updatedAt?: string}).updatedAt ?? null,
      JSON.stringify(category),
    ],
  );
}

function resolveProductPrice(product: MenuProduct): number {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return Math.min(
      ...product.variants.map((variant) => Number(variant.price) || 0),
    );
  }
  return Number(product.price) || 0;
}

async function upsertProduct(tx: Transaction, product: MenuProduct) {
  const imageUrl = product.imageUrl ?? null;
  const existing = await tx.execute(
    'SELECT image_url, local_image_path FROM products WHERE id = ?',
    [product.id],
  );
  const prev = existing.rows?.[0];
  const keepLocal =
    prev &&
    String(prev.image_url ?? '') === String(imageUrl ?? '') &&
    prev.local_image_path
      ? String(prev.local_image_path)
      : null;

  // Always persist a price derived from variants so SQLite/UI stay in sync
  // with admin size-price edits (products have no separate top-level price).
  const unitPrice = resolveProductPrice(product);
  const payloadProduct: MenuProduct = {
    ...product,
    price: unitPrice,
  };

  await tx.execute(
    `INSERT INTO products (
       id, category_id, name, price, status, image_url, image_version,
       local_image_path, is_offer, updated_at, payload_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       category_id = excluded.category_id,
       name = excluded.name,
       price = excluded.price,
       status = excluded.status,
       image_url = excluded.image_url,
       image_version = excluded.image_version,
       local_image_path = excluded.local_image_path,
       is_offer = excluded.is_offer,
       updated_at = excluded.updated_at,
       payload_json = excluded.payload_json`,
    [
      product.id,
      product.category?.id ?? null,
      product.name,
      unitPrice,
      product.status ?? 'Active',
      imageUrl,
      imageUrl,
      keepLocal,
      product.isOffer ? 1 : 0,
      (product as {updatedAt?: string}).updatedAt ?? null,
      JSON.stringify(payloadProduct),
    ],
  );
}

async function upsertOffer(tx: Transaction, offer: MenuOffer) {
  const imageUrl = offer.imageUrl ?? null;
  const existing = await tx.execute(
    'SELECT image_url, local_image_path FROM offers WHERE id = ?',
    [offer.id],
  );
  const prev = existing.rows?.[0];
  const keepLocal =
    prev &&
    String(prev.image_url ?? '') === String(imageUrl ?? '') &&
    prev.local_image_path
      ? String(prev.local_image_path)
      : null;

  await tx.execute(
    `INSERT INTO offers (
       id, name, price, status, image_url, image_version,
       local_image_path, updated_at, payload_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       price = excluded.price,
       status = excluded.status,
       image_url = excluded.image_url,
       image_version = excluded.image_version,
       local_image_path = excluded.local_image_path,
       updated_at = excluded.updated_at,
       payload_json = excluded.payload_json`,
    [
      offer.id,
      offer.name,
      offer.price || 0,
      offer.status ?? 'Active',
      imageUrl,
      imageUrl,
      keepLocal,
      (offer as {updatedAt?: string}).updatedAt ?? null,
      JSON.stringify(offer),
    ],
  );
}

async function upsertHead(tx: Transaction, head: MenuHead) {
  const imageUrl = head.imageUrl ?? null;
  const existing = await tx.execute(
    'SELECT image_url, local_image_path FROM heads WHERE id = ?',
    [head.id],
  );
  const prev = existing.rows?.[0];
  const keepLocal =
    prev &&
    String(prev.image_url ?? '') === String(imageUrl ?? '') &&
    prev.local_image_path
      ? String(prev.local_image_path)
      : null;

  await tx.execute(
    `INSERT INTO heads (
       id, name, status, image_url, image_version, local_image_path,
       updated_at, payload_json
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       status = excluded.status,
       image_url = excluded.image_url,
       image_version = excluded.image_version,
       local_image_path = excluded.local_image_path,
       updated_at = excluded.updated_at,
       payload_json = excluded.payload_json`,
    [
      head.id,
      head.name,
      head.status ?? 'Active',
      imageUrl,
      imageUrl,
      keepLocal,
      (head as {updatedAt?: string}).updatedAt ?? null,
      JSON.stringify(head),
    ],
  );
}

async function upsertProductHead(tx: Transaction, mapping: ProductHeadMapping) {
  await tx.execute(
    `INSERT INTO product_heads (id, head_name, status, updated_at, payload_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       head_name = excluded.head_name,
       status = excluded.status,
       updated_at = excluded.updated_at,
       payload_json = excluded.payload_json`,
    [
      mapping.id,
      mapping.headName,
      mapping.status ?? 'Active',
      (mapping as {updatedAt?: string}).updatedAt ?? null,
      JSON.stringify(mapping),
    ],
  );
}

async function upsertTax(tx: Transaction, tax: TaxRate) {
  await tx.execute(
    `INSERT INTO taxes (id, name, type, value, status, updated_at, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       type = excluded.type,
       value = excluded.value,
       status = excluded.status,
       updated_at = excluded.updated_at,
       payload_json = excluded.payload_json`,
    [
      tax.id ?? tax.name,
      tax.name,
      tax.type,
      tax.value || 0,
      (tax as {status?: string}).status ?? 'Active',
      (tax as {updatedAt?: string}).updatedAt ?? null,
      JSON.stringify(tax),
    ],
  );
}

export interface MenuSyncApplyPayload {
  fullSync: boolean;
  version: string;
  serverTime: string;
  restaurantId: string;
  categories: MenuCategory[];
  products: MenuProduct[];
  offers: MenuOffer[];
  heads: MenuHead[];
  productHeads: ProductHeadMapping[];
  taxes: TaxRate[];
  deleted: {
    products: string[];
    categories: string[];
    offers: string[];
    heads: string[];
    productHeads: string[];
    taxes: string[];
  };
}

export async function applyMenuSyncPayload(
  payload: MenuSyncApplyPayload,
): Promise<void> {
  const db = await getMenuDb();

  await db.transaction(async (tx: Transaction) => {
    if (payload.fullSync) {
      await tx.execute('DELETE FROM products');
      await tx.execute('DELETE FROM categories');
      await tx.execute('DELETE FROM offers');
      await tx.execute('DELETE FROM heads');
      await tx.execute('DELETE FROM product_heads');
      await tx.execute('DELETE FROM taxes');
    }

    for (const category of payload.categories) {
      if (!category?.id) continue;
      if (!isActive(category.status) && !payload.fullSync) {
        await tx.execute('DELETE FROM categories WHERE id = ?', [category.id]);
        continue;
      }
      if (isActive(category.status) || payload.fullSync) {
        await upsertCategory(tx, category);
      }
    }

    for (const product of payload.products) {
      if (!product?.id) continue;
      if (!isActive(product.status)) {
        await tx.execute('DELETE FROM products WHERE id = ?', [product.id]);
        continue;
      }
      await upsertProduct(tx, {...product, isOffer: false});
    }

    for (const offer of payload.offers) {
      if (!offer?.id) continue;
      if (!isActive(offer.status)) {
        await tx.execute('DELETE FROM offers WHERE id = ?', [offer.id]);
        await tx.execute('DELETE FROM products WHERE id = ? AND is_offer = 1', [
          offer.id,
        ]);
        continue;
      }
      await upsertOffer(tx, offer);
      // Mirror offer into products table for Create Order filtering
      const offerProduct: MenuProduct = {
        id: offer.id,
        name: offer.name,
        productType: 'KITCHEN',
        status: isActive(offer.status) ? 'Active' : 'Inactive',
        category: {id: 'offer', name: 'Offer', status: 'Active'},
        price: offer.price,
        taxes: offer.taxes,
        taxData: offer.taxData,
        isOffer: true,
        imageUrl: offer.imageUrl,
        inclusions: offer.inclusions,
        choices: offer.choices,
        drinks: offer.drinks,
      };
      await upsertProduct(tx, offerProduct);
    }

    for (const head of payload.heads) {
      if (!head?.id) continue;
      if (!isActive(head.status)) {
        await tx.execute('DELETE FROM heads WHERE id = ?', [head.id]);
        continue;
      }
      await upsertHead(tx, head);
    }

    for (const mapping of payload.productHeads) {
      if (!mapping?.id) continue;
      if (!isActive(mapping.status)) {
        await tx.execute('DELETE FROM product_heads WHERE id = ?', [mapping.id]);
        continue;
      }
      await upsertProductHead(tx, mapping);
    }

    for (const tax of payload.taxes) {
      const taxId = tax.id ?? tax.name;
      if (!taxId) continue;
      if (!isActive((tax as {status?: string}).status)) {
        await tx.execute('DELETE FROM taxes WHERE id = ?', [taxId]);
        continue;
      }
      await upsertTax(tx, tax);
    }

    const del = payload.deleted;
    if (del.products.length) {
      const placeholders = del.products.map(() => '?').join(',');
      await tx.execute(
        `DELETE FROM products WHERE id IN (${placeholders})`,
        del.products,
      );
    }
    if (del.categories.length) {
      const placeholders = del.categories.map(() => '?').join(',');
      await tx.execute(
        `DELETE FROM categories WHERE id IN (${placeholders})`,
        del.categories,
      );
    }
    if (del.offers.length) {
      const placeholders = del.offers.map(() => '?').join(',');
      await tx.execute(
        `DELETE FROM offers WHERE id IN (${placeholders})`,
        del.offers,
      );
      await tx.execute(
        `DELETE FROM products WHERE id IN (${placeholders}) AND is_offer = 1`,
        del.offers,
      );
    }
    if (del.heads.length) {
      const placeholders = del.heads.map(() => '?').join(',');
      await tx.execute(
        `DELETE FROM heads WHERE id IN (${placeholders})`,
        del.heads,
      );
    }
    if (del.productHeads.length) {
      const placeholders = del.productHeads.map(() => '?').join(',');
      await tx.execute(
        `DELETE FROM product_heads WHERE id IN (${placeholders})`,
        del.productHeads,
      );
    }
    if (del.taxes.length) {
      const placeholders = del.taxes.map(() => '?').join(',');
      await tx.execute(
        `DELETE FROM taxes WHERE id IN (${placeholders})`,
        del.taxes,
      );
    }

    await setSyncMeta(
      payload.restaurantId,
      payload.version,
      payload.serverTime,
      tx,
    );
  });
}

export async function readLocalMenu(): Promise<{
  categories: MenuCategory[];
  products: MenuProduct[];
  offers: MenuOffer[];
  heads: MenuHead[];
  productHeads: ProductHeadMapping[];
  globalTaxes: TaxRate[];
  categoryNames: string[];
  hasData: boolean;
} | null> {
  const db = await getMenuDb();

  const [catRes, prodRes, offerRes, headRes, phRes, taxRes] = await Promise.all(
    [
      db.execute('SELECT payload_json, local_image_path FROM categories'),
      db.execute(
        'SELECT payload_json, local_image_path, image_url FROM products WHERE status IS NULL OR status != ?',
        ['Inactive'],
      ),
      db.execute('SELECT payload_json, local_image_path FROM offers'),
      db.execute('SELECT payload_json, local_image_path FROM heads'),
      db.execute('SELECT payload_json FROM product_heads'),
      db.execute(
        'SELECT payload_json FROM taxes WHERE status IS NULL OR status = ?',
        ['Active'],
      ),
    ],
  );

  const categories = (catRes.rows || [])
    .map((row) =>
      parsePayload<MenuCategory>(String(row.payload_json ?? ''), {
        id: '',
        name: '',
      }),
    )
    .filter((c) => c.id && isActive(c.status));

  const products = (prodRes.rows || [])
    .map((row) => {
      const product = parsePayload<MenuProduct>(String(row.payload_json ?? ''), {
        id: '',
        name: '',
        category: {id: '', name: 'ITEMS'},
        price: 0,
      });
      const localPath = row.local_image_path
        ? String(row.local_image_path)
        : null;
      if (localPath) {
        product.imageUrl = localPath.startsWith('file://')
          ? localPath
          : `file://${localPath}`;
      }
      return product;
    })
    .filter((p) => p.id && isActive(p.status));

  const offers = (offerRes.rows || [])
    .map((row) =>
      parsePayload<MenuOffer>(String(row.payload_json ?? ''), {
        id: '',
        name: '',
        price: 0,
      }),
    )
    .filter((o) => o.id && isActive(o.status));

  const menuHeads = (headRes.rows || [])
    .map((row) => {
      const head = parsePayload<MenuHead>(String(row.payload_json ?? ''), {
        id: '',
        name: '',
      });
      const localPath = row.local_image_path
        ? String(row.local_image_path)
        : null;
      if (localPath) {
        head.imageUrl = localPath.startsWith('file://')
          ? localPath
          : `file://${localPath}`;
      }
      return head;
    })
    .filter(
      (h) =>
        h.id &&
        h.name &&
        String(h.name).toLowerCase() !== 'offer' &&
        isActive(h.status),
    );

  const productHeads = (phRes.rows || [])
    .map((row) =>
      parsePayload<ProductHeadMapping>(String(row.payload_json ?? ''), {
        id: '',
        headName: '',
        productIds: [],
      }),
    )
    .filter((ph) => ph.id && ph.headName && isActive(ph.status));

  const globalTaxes = (taxRes.rows || [])
    .map((row) =>
      parsePayload<TaxRate>(String(row.payload_json ?? ''), {
        name: 'Tax',
        type: 'percent',
        value: 0,
      }),
    )
    .filter((t) => t.name);

  if (
    !categories.length &&
    !products.length &&
    !offers.length &&
    !menuHeads.length
  ) {
    return null;
  }

  const heads: MenuHead[] =
    menuHeads.length > 0
      ? [
          {id: 'all', name: 'All'},
          ...menuHeads,
          {id: 'offer', name: 'Offer'},
        ]
      : [
          {id: 'all', name: 'All'},
          ...categories
            .filter((c) => c.name.toLowerCase() !== 'offer')
            .map((c) => ({id: c.id, name: c.name, status: c.status})),
          {id: 'offer', name: 'Offer'},
        ];

  const categoryNames = [
    'All',
    ...categories.map((c) => c.name),
    ...(offers.length || products.some((p) => p.isOffer) ? ['Offer'] : []),
  ];

  return {
    categories,
    products,
    offers,
    heads,
    productHeads,
    globalTaxes,
    categoryNames,
    hasData: true,
  };
}

export async function setLocalImagePath(
  table: 'products' | 'heads' | 'offers',
  id: string,
  localPath: string,
  imageUrl: string,
): Promise<void> {
  const db = await getMenuDb();
  await db.execute(
    `UPDATE ${table} SET local_image_path = ?, image_version = ? WHERE id = ? AND image_url = ?`,
    [localPath, imageUrl, id, imageUrl],
  );
}

export async function getProductsNeedingImageCache(
  limit = 40,
): Promise<Array<{id: string; imageUrl: string; table: 'products' | 'heads'}>> {
  const db = await getMenuDb();
  const [prodRes, headRes] = await Promise.all([
    db.execute(
      `SELECT id, image_url FROM products
       WHERE image_url IS NOT NULL AND image_url != ''
         AND (local_image_path IS NULL OR local_image_path = '')
         AND image_url NOT LIKE 'file:%'
       LIMIT ?`,
      [limit],
    ),
    db.execute(
      `SELECT id, image_url FROM heads
       WHERE image_url IS NOT NULL AND image_url != ''
         AND (local_image_path IS NULL OR local_image_path = '')
         AND image_url NOT LIKE 'file:%'
       LIMIT ?`,
      [Math.min(12, limit)],
    ),
  ]);

  return [
    ...(prodRes.rows || []).map((row) => ({
      id: String(row.id),
      imageUrl: String(row.image_url),
      table: 'products' as const,
    })),
    ...(headRes.rows || []).map((row) => ({
      id: String(row.id),
      imageUrl: String(row.image_url),
      table: 'heads' as const,
    })),
  ];
}
