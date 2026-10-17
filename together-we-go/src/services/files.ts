/**
 * Offline document vault. Picked files are copied into the app's private
 * document directory (native) so they stay readable with no connection.
 * On web, small files are kept as data URLs in local storage.
 */
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export const MAX_WEB_BYTES = 2 * 1024 * 1024;
export const MAX_NATIVE_BYTES = 25 * 1024 * 1024;

export interface SavedFile {
  uri: string;
  name: string;
  size?: number;
  kind: 'pdf' | 'image' | 'file';
}

function kindOf(name: string, mime?: string | null): SavedFile['kind'] {
  if (mime?.startsWith('image/') || /\.(png|jpe?g|heic|webp|gif)$/i.test(name)) return 'image';
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) return 'pdf';
  return 'file';
}

async function toDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function persist(uri: string, name: string, webFile?: Blob | null): Promise<string> {
  if (Platform.OS === 'web') {
    if (webFile) return toDataUrl(webFile);
    return uri;
  }
  const dir = new Directory(Paths.document, 'vault');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const safe = `${Date.now()}-${name.replace(/[^\w.-]+/g, '_')}`;
  const dest = new File(dir, safe);
  await new File(uri).copy(dest);
  return dest.uri;
}

export class FileTooLargeError extends Error {}

/** Lets the user pick a PDF/image/any file and saves an offline copy. */
export async function pickDocument(): Promise<SavedFile | null> {
  const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: ['application/pdf', 'image/*', '*/*'] });
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const limit = Platform.OS === 'web' ? MAX_WEB_BYTES : MAX_NATIVE_BYTES;
  if (a.size && a.size > limit) throw new FileTooLargeError(`Files must be under ${Math.round(limit / 1024 / 1024)} MB`);
  const uri = await persist(a.uri, a.name, (a as { file?: Blob }).file ?? null);
  return { uri, name: a.name, size: a.size, kind: kindOf(a.name, a.mimeType) };
}

/** Picks a photo from the library (or camera) and keeps an offline copy. */
export async function pickImage(fromCamera = false): Promise<SavedFile | null> {
  if (fromCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera permission is needed to take photos.');
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsEditing: false };
  const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const name = a.fileName ?? `photo-${Date.now()}.jpg`;
  if (Platform.OS === 'web') {
    if (a.fileSize && a.fileSize > MAX_WEB_BYTES) throw new FileTooLargeError('Photos must be under 2 MB in the web preview');
    return { uri: a.uri, name, size: a.fileSize, kind: 'image' };
  }
  const uri = await persist(a.uri, name);
  return { uri, name, size: a.fileSize, kind: 'image' };
}

export function deleteLocalFile(uri?: string) {
  if (!uri || Platform.OS === 'web' || !uri.startsWith('file:')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // already gone
  }
}

export function sizeLabel(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
