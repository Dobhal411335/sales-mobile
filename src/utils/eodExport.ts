import type {EodExportKind} from '../types/eod';
import {isEodApiConfigured} from '../services/eodService';

/**
 * Shares a backend-generated EOD export file using native share sheet.
 * Requires react-native-blob-util and react-native-share when API is live.
 */
export async function shareEodExportFile(
  blob: Blob,
  filename: string,
  kind: EodExportKind,
): Promise<{success: boolean; message?: string}> {
  if (!isEodApiConfigured()) {
    return {success: false, message: 'Export requires backend connection.'};
  }

  try {
    const ReactNativeBlobUtil = (await import('react-native-blob-util')).default;
    const Share = (await import('react-native-share')).default;

    const mimeType =
      kind === 'excel'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';

    const base64 = await blobToBase64(blob);
    const cachePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename}`;

    await ReactNativeBlobUtil.fs.writeFile(cachePath, base64, 'base64');

    await Share.open({
      url: PlatformNormalizeFileUrl(cachePath),
      type: mimeType,
      filename,
      failOnCancel: false,
    });

    return {success: true};
  } catch {
    return {success: false, message: 'Unable to generate report. Try again.'};
  }
}

function PlatformNormalizeFileUrl(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read export file'));
        return;
      }
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
