/**
 * Saves a blob under a given filename.
 *
 * Downloads go through the API with an Authorization header, so the response
 * arrives as a blob rather than something a plain <a href> could fetch. The
 * object URL is revoked afterwards to avoid leaking it for the page's lifetime.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Deferred: revoking in the same task can cancel the download before the
  // browser has started reading the blob.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
