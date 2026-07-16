export const PLACEHOLDER_IMAGE = '/images/car.png';

const ABSOLUTE_HTTP_URL = /^https?:\/\//i;

export const needsApiImage = (imageUrl) => {
  if (!imageUrl) {
    return true;
  }

  const value = String(imageUrl).trim();

  if (!value || value === PLACEHOLDER_IMAGE) {
    return true;
  }

  if (value.startsWith('/images/vehicles/')) {
    return true;
  }

  if (ABSOLUTE_HTTP_URL.test(value)) {
    return false;
  }

  if (value.startsWith('/')) {
    return false;
  }

  return true;
};

export const buildVehicleSpecs = (vehicle = {}) => ({
  year: vehicle.year ?? null,
  make: vehicle.make ?? null,
  model: vehicle.model ?? null,
  mileage: vehicle.mileage ?? null,
  availability: typeof vehicle.availability === 'boolean' ? (vehicle.availability ? 'Available' : 'Unavailable') : null,
  description: vehicle.description || '',
  category: vehicle.category_name || null,
});