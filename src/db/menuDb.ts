import {open, type DB} from '@op-engineering/op-sqlite';
import {MENU_DB_NAME, MENU_SCHEMA_VERSION} from './menuSchema';

let dbInstance: DB | null = null;
let initPromise: Promise<DB> | null = null;

const MIGRATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS menu_sync_meta (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    restaurant_id TEXT NOT NULL,
    version TEXT,
    last_synced_at TEXT,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    status TEXT,
    updated_at TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    category_id TEXT,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    status TEXT,
    image_url TEXT,
    image_version TEXT,
    local_image_path TEXT,
    is_offer INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    status TEXT,
    image_url TEXT,
    image_version TEXT,
    local_image_path TEXT,
    updated_at TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS heads (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    status TEXT,
    image_url TEXT,
    image_version TEXT,
    local_image_path TEXT,
    updated_at TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS product_heads (
    id TEXT PRIMARY KEY NOT NULL,
    head_name TEXT NOT NULL,
    status TEXT,
    updated_at TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS taxes (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    value REAL NOT NULL DEFAULT 0,
    status TEXT,
    updated_at TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)`,
  `CREATE INDEX IF NOT EXISTS idx_products_is_offer ON products(is_offer)`,
];

async function migrate(db: DB): Promise<void> {
  await db.execute('PRAGMA journal_mode = WAL;');
  await db.execute(
    `CREATE TABLE IF NOT EXISTS schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL
    );`,
  );

  const result = await db.execute(
    'SELECT version FROM schema_version WHERE id = 1',
  );
  const current = Number(result.rows?.[0]?.version ?? 0);

  if (current < MENU_SCHEMA_VERSION) {
    for (const sql of MIGRATION_STATEMENTS) {
      await db.execute(sql);
    }
    await db.execute(
      `INSERT INTO schema_version (id, version) VALUES (1, ?)
       ON CONFLICT(id) DO UPDATE SET version = excluded.version`,
      [MENU_SCHEMA_VERSION],
    );
  }
}

export async function getMenuDb(): Promise<DB> {
  if (dbInstance) {
    return dbInstance;
  }
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = open({name: MENU_DB_NAME});
    await migrate(db);
    dbInstance = db;
    return db;
  })();

  try {
    return await initPromise;
  } catch (error) {
    initPromise = null;
    dbInstance = null;
    throw error;
  }
}

export async function clearAllMenuTables(db: DB): Promise<void> {
  await db.execute('DELETE FROM products');
  await db.execute('DELETE FROM categories');
  await db.execute('DELETE FROM offers');
  await db.execute('DELETE FROM heads');
  await db.execute('DELETE FROM product_heads');
  await db.execute('DELETE FROM taxes');
  await db.execute('DELETE FROM menu_sync_meta');
}
