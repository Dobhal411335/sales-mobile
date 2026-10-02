import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  getProductsNeedingImageCache,
  setLocalImagePath,
} from '../db/repositories/menuRepository';

const CACHE_DIR = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/menu-images`;
let queueRunning = false;
const pendingIds = new Set<string>();

/**
 * Insert Cloudinary transform for POS thumbnails when URL is a Cloudinary delivery URL.
 */
export function toThumbnailUrl(url: string, width = 256): string {
  if (!url || url.startsWith('file:')) {
    return url;
  }
  // Cloudinary: .../upload/v123/... → .../upload/w_256,c_fill,f_auto,q_auto/v123/...
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    if (url.includes(`w_${width}`)) {
      return url;
    }
    return url.replace('/upload/', `/upload/w_${width},c_fill,f_auto,q_auto/`);
  }
  return url;
}

function hashKey(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

async function ensureCacheDir(): Promise<void> {
  const exists = await ReactNativeBlobUtil.fs.isDir(CACHE_DIR);
  if (!exists) {
    await ReactNativeBlobUtil.fs.mkdir(CACHE_DIR);
  }
}

async function downloadOne(
  id: string,
  imageUrl: string,
  table: 'products' | 'heads' | 'offers',
): Promise<string | null> {
  if (!imageUrl || imageUrl.startsWith('file:')) {
    return imageUrl || null;
  }

  try {
    await ensureCacheDir();
    const thumbUrl = toThumbnailUrl(imageUrl);
    const extMatch = thumbUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
    const fileName = `${table}_${id}_${hashKey(imageUrl)}.${ext}`;
    const path = `${CACHE_DIR}/${fileName}`;

    const already = await ReactNativeBlobUtil.fs.exists(path);
    if (!already) {
      const res = await ReactNativeBlobUtil.config({
        path,
        fileCache: true,
        timeout: 20000,
      }).fetch('GET', thumbUrl);
      if (res.info().status >= 400) {
        return null;
      }
    }

    await setLocalImagePath(table, id, path, imageUrl);
    return path;
  } catch {
    return null;
  }
}

/**
 * Prefetch a limited set of missing menu images without blocking the JS UI thread.
 */
export function prefetchMenuImages(limit = 24): void {
  if (queueRunning) {
    return;
  }
  queueRunning = true;

  void (async () => {
    try {
      const items = await getProductsNeedingImageCache(limit);
      for (const item of items) {
        const key = `${item.table}:${item.id}`;
        if (pendingIds.has(key)) {
          continue;
        }
        pendingIds.add(key);
        await downloadOne(item.id, item.imageUrl, item.table);
        pendingIds.delete(key);
        // Yield between downloads
        await new Promise<void>((resolve) => setTimeout(resolve, 16));
      }
    } catch {
      /* ignore */
    } finally {
      queueRunning = false;
    }
  })();
}

export async function cacheImageForProduct(
  id: string,
  imageUrl: string,
): Promise<string | null> {
  return downloadOne(id, imageUrl, 'products');
}
