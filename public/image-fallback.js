(() => {
  const PLACEHOLDER = '/images/car.png';
  const ABSOLUTE_URL = /^https?:\/\//i;

  const normalizeSource = (value) => {
    const src = String(value || '').trim();

    if (!src) {
      return PLACEHOLDER;
    }

    if (ABSOLUTE_URL.test(src) || src.startsWith('/')) {
      return src;
    }

    if (src.startsWith('images/')) {
      return `/${src}`;
    }

    return PLACEHOLDER;
  };

  document.querySelectorAll('img[data-fallback-src]').forEach((image) => {
    const fallback = image.getAttribute('data-fallback-src') || PLACEHOLDER;
    image.src = normalizeSource(image.getAttribute('src'));
    image.addEventListener('error', () => {
      image.src = fallback;
    });
  });
})();