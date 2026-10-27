/**
 * Lets the sync code record which file on the sync server belongs to a photo, a document or a receipt.
 */
import { tripHelpers } from './helpers';
import type { Slice } from './types';

export type FileList = 'photos' | 'docs' | 'expenses';

export interface FilesSlice {
  attachBlob: (tripId: string, list: FileList, itemId: string, blobId: string) => void;
}

export const createFilesSlice: Slice<FilesSlice> = (set, get) => {
  const { withTrip } = tripHelpers(set, get);
  return {
    attachBlob: (tripId, list, itemId, blobId) =>
      withTrip(tripId, (t) => {
        if (list === 'photos') {
          const photo = t.photos.find((x) => x.id === itemId);
          if (photo) photo.blob = blobId;
        } else if (list === 'docs') {
          const doc = t.docs.find((x) => x.id === itemId);
          if (doc) doc.blob = blobId;
        } else {
          const expense = t.expenses.find((x) => x.id === itemId);
          if (expense) expense.receiptBlob = blobId;
        }
      }),
  };
};
