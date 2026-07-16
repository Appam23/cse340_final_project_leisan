import { getCategories, getVehicleById, getVehicles, getVehiclesByCategory } from '../models/inventoryModel.js';
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

const enrichVehiclesWithImages = async (vehicles, { padToTwelve = false } = {}) => {
  const results = [];

  for (const vehicle of vehicles) {
    const shouldFetchApiImage = needsApiImage(vehicle.image_url);

    if (!shouldFetchApiImage) {
      results.push(vehicle);
      continue;
    }

    const apiImageUrl = await getVehicleImageFromApi(vehicle);
    results.push({
      ...vehicle,
      image_url: apiImageUrl || PLACEHOLDER_IMAGE,
    });
  }

  if (padToTwelve && results.length < TARGET_CARD_COUNT) {
    const cardsToAdd = TARGET_CARD_COUNT - results.length;

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

      results.push({
        ...fallbackVehicle,
        image_url: apiImageUrl || PLACEHOLDER_IMAGE,
      });
    }
  }

  return results;
};

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
    const vehiclesWithApiImages = await enrichVehiclesWithImages(vehicles, {
      padToTwelve: !normalizedSearch,
    });
    const categories = await getCategories();

    res.render('inventory/index', {
      title: 'Inventory',
      heading: 'Inventory',
      vehicles: vehiclesWithApiImages,
      search,
      categories,
      activeCategory: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function categoryVehicles(req, res, next) {
  try {
    const categoryName = req.params.categoryName;
    const vehicles = await getVehiclesByCategory(categoryName);
    const vehiclesWithApiImages = await enrichVehiclesWithImages(vehicles);
    const categories = await getCategories();

    return res.render('inventory/index', {
      title: `Category: ${categoryName}`,
      heading: `Category: ${categoryName}`,
      vehicles: vehiclesWithApiImages,
      search: '',
      categories,
      activeCategory: categoryName,
    });
  } catch (error) {
    next(error);
  }
}

export async function vehicleDetail(req, res, next) {
  try {
    const vehicle = await getVehicleById(req.params.id);

    if (!vehicle) {
      return res.status(404).render('404', { title: 'Not Found' });
    }

    const imageUrl = needsApiImage(vehicle.image_url)
      ? await getVehicleImageFromApi(vehicle) || vehicle.image_url || PLACEHOLDER_IMAGE
      : vehicle.image_url || PLACEHOLDER_IMAGE;

    const car = {
      id: vehicle.id,
      title: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      src: imageUrl,
      attribution: 'Inventory listing',
      price: vehicle.price ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(vehicle.price) : 'Contact for price',
    };

    return res.render('car-review', {
      title: car.title,
      car,
      fieldErrors: {},
      inquirySuccess: null,
      inquiryError: null,
      formData: {},
      reviewForm: {
        rating: '',
        comment: '',
        editingReviewId: null,
      },
      reviewFieldErrors: {},
      reviewError: null,
      serviceForm: {
        serviceType: '',
        notes: '',
      },
      serviceFieldErrors: {},
      serviceError: null,
      serviceRequests: [],
      reviews: [],
    });
  } catch (error) {
    next(error);
  }
}