// Avatars and group pictures travel inside lists (the friends list, the chat groups), so a picture
// is shrunk in the browser before it is sent: a phone photo would otherwise be megabytes on every
// load. Square, cropped from the middle, since they are all shown in a circle.
const MAX_SIDE = 256;
const QUALITY = 0.82;

export const shrinkToAvatar = (file: File): Promise<Blob> => new Promise((resolve, reject) => {
  const image = new Image();
  const source = URL.createObjectURL(file);

  const fail = () => {
    URL.revokeObjectURL(source);
    reject(new Error('Could not read the picture'));
  };

  image.onload = () => {
    URL.revokeObjectURL(source);
    const side = Math.min(image.width, image.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(side, MAX_SIDE);
    canvas.height = canvas.width;

    canvas.getContext('2d')?.drawImage(image,
      (image.width - side) / 2, (image.height - side) / 2, side, side,
      0, 0, canvas.width, canvas.height);

    canvas.toBlob(picture => picture ? resolve(picture) : reject(new Error('Could not read the picture')),
      'image/jpeg', QUALITY);
  };
  image.onerror = fail;
  image.src = source;
});

// Content images (categories, glossary terms, knowledge base) are stored in the database and ride
// inside every list that shows them, so a camera-sized picture is scaled down before it is sent.
// Cropped square from the middle, the shape the pickers and tables show them in, and WebP so logos
// keep their transparency. GIFs (animation) and SVGs (already small, and a canvas would flatten
// them) pass through untouched.
const COVER_SIDE = 1024;
const COVER_QUALITY = 0.85;

export const shrinkToCover = (file: File): Promise<File> => new Promise((resolve) => {
  if (!/^image\/(png|jpeg|webp|bmp)$/.test(file.type)) {
    resolve(file);
    return;
  }
  const image = new Image();
  const source = URL.createObjectURL(file);

  image.onload = () => {
    URL.revokeObjectURL(source);
    // The largest square that fits, centred.
    const side = Math.min(image.width, image.height);
    // Off by more than a pixel: it had to be cropped, so the original will not do even if smaller.
    const cropped = Math.abs(image.width - image.height) > 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(side, COVER_SIDE);
    canvas.height = canvas.width;
    canvas.getContext('2d')?.drawImage(image,
      (image.width - side) / 2, (image.height - side) / 2, side, side,
      0, 0, canvas.width, canvas.height);

    // Safari cannot encode WebP and hands back a PNG instead; the size check still guards that.
    canvas.toBlob(picture => resolve(picture && (cropped || picture.size < file.size)
      ? new File([picture], file.name.replace(/\.\w+$/, '') + (picture.type === 'image/webp' ? '.webp' : '.png'),
        { type: picture.type })
      : file), 'image/webp', COVER_QUALITY);
  };
  // Unreadable here: let the server have the original and decide.
  image.onerror = () => {
    URL.revokeObjectURL(source);
    resolve(file);
  };
  image.src = source;
});
