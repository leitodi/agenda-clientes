const normalizeImages = (input) => {
  if (!input) return [];

  let images = input;

  if (typeof images === 'string') {
    try {
      images = JSON.parse(images);
    } catch {
      images = [images];
    }
  }

  if (!Array.isArray(images)) {
    images = [images];
  }

  return images
    .map((image) => {
      if (!image) return null;

      if (typeof image === 'string') {
        return {
          url: image,
          date: new Date().toISOString(),
        };
      }

      if (typeof image === 'object' && typeof image.url === 'string') {
        return {
          url: image.url,
          date: image.date || new Date().toISOString(),
        };
      }

      return null;
    })
    .filter(Boolean);
};

module.exports = normalizeImages;
