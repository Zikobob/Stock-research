/** Moves files between this phone and the sync server: native files on iOS and Android, browser files on the web. */
import { Directory, File, Paths, UploadType } from 'expo-file-system';
import { Platform } from 'react-native';

import { FileTransferError, type BlobFiles } from './blobs';

/** Which kind of failure an HTTP status means. 5xx and anything else odd is treated like a lost connection: try again later. */
function failureFor(status: number, what: string): FileTransferError {
  if (status === 400 || status === 413) return new FileTransferError('rejected', `The server did not accept the file (${status})`);
  if (status === 404) return new FileTransferError('missing', `${what} is not on the server`);
  return new FileTransferError('network', `The server answered ${status}`);
}

const nativeFiles: BlobFiles = {
  async exists(uri) {
    try {
      return new File(uri).exists;
    } catch {
      return false;
    }
  },
  async size(uri) {
    try {
      const file = new File(uri);
      return file.exists ? file.size : null;
    } catch {
      return null;
    }
  },
  async upload(uri, url) {
    let status: number;
    try {
      const res = await new File(uri).upload(url, {
        httpMethod: 'PUT',
        uploadType: UploadType.BINARY_CONTENT,
        headers: { 'Content-Type': 'application/octet-stream' },
        sessionType: 'foreground',
      });
      status = res.status;
    } catch (e) {
      throw new FileTransferError('network', e instanceof Error ? e.message : 'Upload failed');
    }
    if (status < 200 || status >= 300) throw failureFor(status, 'The trip');
  },
  async download(url, name) {
    const dir = new Directory(Paths.document, 'shared');
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    try {
      const file = await File.downloadFileAsync(url, new File(dir, name), { idempotent: true });
      return file.uri;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Download failed';
      throw /\b404\b/.test(message) ? new FileTransferError('missing', 'That file is not on the server') : new FileTransferError('network', message);
    }
  },
};

const webFiles: BlobFiles = {
  async exists(uri) {
    try {
      return (await fetch(uri)).ok;
    } catch {
      return false;
    }
  },
  async size(uri) {
    try {
      return (await (await fetch(uri)).blob()).size;
    } catch {
      return null;
    }
  },
  async upload(uri, url) {
    let res: Response;
    try {
      res = await fetch(url, { method: 'PUT', body: await (await fetch(uri)).blob() });
    } catch (e) {
      throw new FileTransferError('network', e instanceof Error ? e.message : 'Upload failed');
    }
    if (!res.ok) throw failureFor(res.status, 'The trip');
  },
  async download(url) {
    let res: Response;
    try {
      res = await fetch(url);
    } catch (e) {
      throw new FileTransferError('network', e instanceof Error ? e.message : 'Download failed');
    }
    if (!res.ok) throw failureFor(res.status, 'That file');
    return URL.createObjectURL(await res.blob());
  },
};

export const deviceFiles: BlobFiles = Platform.OS === 'web' ? webFiles : nativeFiles;

/** Deletes everything this phone downloaded from friends (used by "reset app data"). */
export function deleteSharedFiles(): void {
  if (Platform.OS === 'web') return;
  try {
    const dir = new Directory(Paths.document, 'shared');
    if (dir.exists) dir.delete();
  } catch {
    // nothing to delete
  }
}
