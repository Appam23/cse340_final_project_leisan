import { getVehicles } from '../models/inventoryModel.js';
import { getVehicleImageFromApi } from '../services/vehicleImageService.js';

const PLACEHOLDER_IMAGE = '/images/car.png';
const ABSOLUTE_HTTP_URL = /^https?:\/\//i;
const TARGET_CARD_COUNT = 12;

const fallbackVehicleSeeds = [
  { year: 2024, make: 'Audi', model: 'A4' },
  { year: 2023, make: 'Lexus', model: 'RX 350' },
  { year: 2022, make: 'Tesla', model: 'Model 3' },
  { year: 2021, make: 'Nissan', model: 'Altima' },
  { year: 2020, make: 'Kia', model: 'Telluride' },
  { year: 2019, make: 'Hyundai', model: 'Sonata' },
];

const needsApiImage = (imageUrl) => {
  if (!imageUrl) {
    return true;
  }

  const value = imageUrl.trim();

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

  // Filename-only and relative paths are broken under /inventory and should use API.
  return true;
};

export async function listVehicles(req, res, next) {
  try {
    const search = req.query.search || '';
    const normalizedSearch = search.trim();
    const vehicles = await getVehicles(search);
    const vehiclesWithApiImages = [];

    for (const vehicle of vehicles) {
      const shouldFetchApiImage = needsApiImage(vehicle.image_url);

      if (!shouldFetchApiImage) {
        vehiclesWithApiImages.push(vehicle);
        continue;
      }

      const apiImageUrl = await getVehicleImageFromApi(vehicle);
      vehiclesWithApiImages.push({
        ...vehicle,
        image_url: apiImageUrl || PLACEHOLDER_IMAGE,
      });
    }

    if (!normalizedSearch && vehiclesWithApiImages.length < TARGET_CARD_COUNT) {
      const cardsToAdd = TARGET_CARD_COUNT - vehiclesWithApiImages.length;

      for (let index = 0; index < cardsToAdd; index += 1) {
        const seed = fallbackVehicleSeeds[index % fallbackVehicleSeeds.length];
        const fallbackVehicle = {
          id: `fallback-${index + 1}`,
          ...seed,
          price: null,
          mileage: null,
          image_url: PLACEHOLDER_IMAGE,
        };
        const apiImageUrl = await getVehicleImageFromApi(fallbackVehicle);

        vehiclesWithApiImages.push({
          ...fallbackVehicle,
          image_url: apiImageUrl || PLACEHOLDER_IMAGE,
        });
      }
    }

    res.render('inventory/index', {
      title: 'Inventory',
      vehicles: vehiclesWithApiImages,
      search,
    });
  } catch (error) {
    next(error);
  }
}