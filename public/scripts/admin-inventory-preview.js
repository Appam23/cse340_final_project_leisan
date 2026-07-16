(() => {
  const PLACEHOLDER = '/images/car.png';
  const ABSOLUTE_URL = /^https?:\/\//i;

  const normalizeImageSrc = (value) => {
    const normalized = String(value || '').trim();

    if (!normalized) {
      return PLACEHOLDER;
    }

    if (ABSOLUTE_URL.test(normalized) || normalized.startsWith('/')) {
      return normalized;
    }

    if (normalized.startsWith('images/')) {
      return `/${normalized}`;
    }

    return PLACEHOLDER;
  };

  const attachPreview = (inputId, previewId) => {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    if (!input || !preview) {
      return;
    }

    preview.addEventListener('error', () => {
      preview.src = PLACEHOLDER;
    });

    const updatePreview = () => {
      preview.src = normalizeImageSrc(input.value);
    };

    input.addEventListener('input', updatePreview);

    // Also normalize the existing saved value on first render.
    updatePreview();
  };

  attachPreview('image-url-input', 'admin-image-preview');
  attachPreview('edit-image-url-input', 'edit-admin-image-preview');
})();