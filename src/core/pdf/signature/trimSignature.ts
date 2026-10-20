/**
 * Acrobat-style signature margin trimming utility.
 * Trims transparent margins (from drawing pads) and near-white paper margins (from photos),
 * leaving a clean bounding box with subtle padding.
 */

export async function trimSignatureBlob(blob: Blob): Promise<Blob> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return blob;
  }

  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      bitmap.close?.();
      return blob;
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close?.();

    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        // Ignore transparent pixels
        if (data[i + 3] < 24) continue;
        // Calculate luminosity
        const lum = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        // Ignore near-white background pixels
        if (lum > 242) continue;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }

    if (maxX < 0) return blob; // All transparent/blank

    const pad = 12;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(width - 1, maxX + pad);
    maxY = Math.min(height - 1, maxY + pad);

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;

    if (w >= width && h >= height) return blob;

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const octx = out.getContext('2d');
    if (!octx) return blob;

    octx.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);

    return await new Promise<Blob>((resolve) => {
      out.toBlob((b) => resolve(b ?? blob), 'image/png');
    });
  } catch {
    return blob;
  }
}
