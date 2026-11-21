// The file name and size of the CV just uploaded in this tab, for the line on B1 and B2
// ("my-cv.pdf, 412 KB"). Kept only in the page's memory while the app moves from the upload
// page to processing without a full reload; never written to storage, a cookie or the address.
// After a refresh it is gone and the line is simply hidden.

export type UploadedFile = { scanSessionId: string; name: string; size: number };

let lastUpload: UploadedFile | undefined;

export function rememberUploadedFile(file: UploadedFile): void {
  lastUpload = file;
}

/** The file for this scan, if this tab uploaded it and has not reloaded since. */
export function uploadedFileFor(scanSessionId: string): UploadedFile | undefined {
  return lastUpload?.scanSessionId === scanSessionId ? lastUpload : undefined;
}
