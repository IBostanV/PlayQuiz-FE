// A picture made fit to be a background, in the browser before it is sent: no side longer than
// 1920 px, WebP (JPEG where the browser cannot write WebP), and under the size the server takes,
// trying lower qualities until it is. Null when even the lowest is too big.
export const shrinkImage = async (file, {maxSide = 1920, maxBytes = 1024 * 1024} = {}) => {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const encode = (type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));
    for (const quality of [0.8, 0.65, 0.5]) {
        // A browser that cannot write WebP hands back a PNG instead, which would be far bigger.
        let blob = await encode('image/webp', quality);
        if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', quality);
        if (blob && blob.size <= maxBytes) return blob;
    }
    return null;
};
