/**
 * Ephemeral Object URL Manager
 * Tracks active object URLs to prevent memory leaks and ensure cleanup.
 */

const activeUrls = new Set<string>();

/**
 * Creates an Object URL from a Blob and registers it in the tracked registry.
 */
export function createTrackedUrl(blob: Blob): string {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return '';
  }
  const url = URL.createObjectURL(blob);
  activeUrls.add(url);
  return url;
}

/**
 * Revokes a tracked Object URL and removes it from the registry.
 */
export function revokeTrackedUrl(url: string | null | undefined): void {
  if (!url) return;
  if (activeUrls.has(url)) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore failure in non-browser environments
    }
    activeUrls.delete(url);
  }
}

/**
 * Revokes all currently active tracked Object URLs.
 */
export function revokeAllTrackedUrls(): void {
  activeUrls.forEach(url => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore failure in non-browser environments
    }
  });
  activeUrls.clear();
}

/**
 * Returns the count of currently active tracked Object URLs.
 */
export function getActiveUrlCount(): number {
  return activeUrls.size;
}
