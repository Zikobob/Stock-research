import { useBlobCache } from './blobCache';
import { resolveFile } from './blobs';

export interface SharedFile {
  /** Where to open the file from, when this phone has it. */
  uri: string | undefined;
  /** True while a copy from a friend is on its way. */
  loading: boolean;
}

/**
 * The file to show for a photo, document or receipt: this phone's own file if it has one, otherwise the copy
 * that was downloaded from a friend through the sync server.
 */
export function useSharedFile(local: string | undefined, blob: string | undefined): SharedFile {
  const downloaded = useBlobCache((s) => (blob ? s.files[blob] : undefined));
  return resolveFile(local, blob, downloaded);
}
