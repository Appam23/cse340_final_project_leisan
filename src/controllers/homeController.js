// Controller = the brain that handles home page logic

import { getCategories, getFeaturedVehicles } from '../models/inventoryModel.js';
import { getVehicleImageFromApi } from '../services/vehicleImageService.js';

const carApiUrl = 'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json';
const carImageApiUrl = 'https://api.openverse.org/v1/images/?q=car&per_page=20';

const pickRandomItems = (items, count) => {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const pickRandomItem = (items) => items[Math.floor(Math.random() * items.length)];

const slugify = (value) => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40) || 'car';

const createHash = (value) => {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % 100000;
  }

  return hash;
};

const formatPrice = (seed) => {
  const hash = createHash(seed);
  const price = 18000 + (hash % 62000);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
};

const buildCarCard = (image, index, prefix = 'car') => {
  const title = image.title || 'Car image';
  const source = image.src;
  const idSeed = `${title}-${image.attribution || 'openverse'}-${index}`;
  const id = `${prefix}-${slugify(title)}-${createHash(idSeed)}`;

  return {
    id,
    title,
    src: source,
    attribution: image.attribution || 'Openverse',
    price: formatPrice(idSeed),
    detailHref: `/cars/${id}`,
  };
};

const formatUsd = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const categoryHref = (dbCategory) => `/inventory/type/${encodeURIComponent(dbCategory)}`;

const resolveCategoryBrowseLinks = (categories) => {
  const names = categories.map((category) => category.name);
  const findMatch = (targets) => names.find((name) => targets.includes(name.toLowerCase()));

  const truckMatch = findMatch(['trucks', 'truck']);
  const vanMatch = findMatch(['vans', 'van']);
  const carMatch = findMatch(['cars', 'car', 'sedan', 'sedans']);
  const suvMatch = findMatch(['suvs', 'suv']);

  return [
    {
      label: 'Trucks',
      href: truckMatch ? categoryHref(truckMatch) : '/inventory',
    },
    {
      label: 'Vans',
      href: vanMatch ? categoryHref(vanMatch) : '/inventory',
    },
    {
      label: 'Cars',
      href: carMatch ? categoryHref(carMatch) : '/inventory',
    },
    {
      label: 'SUVs',
      href: suvMatch ? categoryHref(suvMatch) : '/inventory',
    },
  ];
};

const PLACEHOLDER_IMAGE = '/images/car.png';
const ABSOLUTE_HTTP_URL = /^https?:\/\//i;

const needsApiImage = (imageUrl) => {
  if (!imageUrl) {
    return true;
  }

  const value = String(imageUrl).trim();

  if (!value || value === PLACEHOLDER_IMAGE) {
    return true;
  }

  if (value.startsWith('/images/vehicles/') || value.startsWith('images/vehicles/')) {
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

const enrichFeaturedVehiclesWithImages = async (vehicles) => {
  const enriched = [];

  for (const vehicle of vehicles) {
    if (!needsApiImage(vehicle.image_url)) {
      enriched.push(vehicle);
      continue;
    }

    const apiImageUrl = await getVehicleImageFromApi(vehicle);
    enriched.push({
      ...vehicle,
      image_url: apiImageUrl || PLACEHOLDER_IMAGE,
    });
  }

  return enriched;
};

export const getHome = async (req, res) => {
  try {
    const [makeResponse, imageResponse, featuredVehiclesRaw, categories] = await Promise.all([
      fetch(carApiUrl),
      fetch(carImageApiUrl),
      getFeaturedVehicles(4),
      getCategories(),
    ]);

    if (!makeResponse.ok) {
      throw new Error(`Car API request failed with status ${makeResponse.status}`);
    }

    if (!imageResponse.ok) {
      throw new Error(`Car image API request failed with status ${imageResponse.status}`);
    }

    const [makeData, imageData] = await Promise.all([
      makeResponse.json(),
      imageResponse.json(),
    ]);

    const carMakes = Array.isArray(makeData.Results)
      ? makeData.Results.map((make) => make.MakeName)
      : [];

    const carImages = Array.isArray(imageData.results)
      ? imageData.results.map((image) => ({
          src: image.thumbnail || image.url,
          title: image.title,
          attribution: image.attribution,
        }))
      : [];

    const featuredMake = carMakes.length > 0
      ? carMakes[Math.floor(Math.random() * carMakes.length)]
      : 'Car API';

    const featuredImage = carImages.length > 0
      ? pickRandomItem(carImages)
      : {
          src: '/images/car.png',
          title: 'Car photo',
          attribution: 'Local fallback image',
        };

    const featuredCar = buildCarCard(featuredImage, 0, 'featured');
    const galleryCars = pickRandomItems(carImages, 8).map((image, index) => buildCarCard(image, index + 1));
    const featuredVehiclesWithImages = await enrichFeaturedVehiclesWithImages(featuredVehiclesRaw);
    const featuredVehicles = featuredVehiclesWithImages.map((vehicle) => ({
      ...vehicle,
      title: [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' '),
      priceLabel: formatUsd(vehicle.price),
      detailHref: `/inventory/${vehicle.id}`,
    }));
    const browseCategories = resolveCategoryBrowseLinks(categories);

    req.session.carShowcase = [featuredCar, ...galleryCars];

    res.render('home', {
      title: 'Car Franchise',
      featuredCar,
      carImages: galleryCars,
      featuredMake,
      carMakes: pickRandomItems(carMakes, 6),
      apiCount: makeData.Count ?? carMakes.length,
      apiMessage: makeData.Message ?? 'Live car data fetched from NHTSA.',
      featuredVehicles,
      browseCategories,
    });
  } catch (error) {
    console.error('Home API error:', error);

    const [featuredVehiclesRaw, categories] = await Promise.all([
      getFeaturedVehicles(4).catch(() => []),
      getCategories().catch(() => []),
    ]);
    const featuredVehiclesWithImages = await enrichFeaturedVehiclesWithImages(featuredVehiclesRaw);
    const featuredVehicles = featuredVehiclesWithImages.map((vehicle) => ({
      ...vehicle,
      title: [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' '),
      priceLabel: formatUsd(vehicle.price),
      detailHref: `/inventory/${vehicle.id}`,
    }));
    const browseCategories = resolveCategoryBrowseLinks(categories);

    res.render('home', {
      title: 'Car Franchise',
      featuredCar: buildCarCard({
        src: '/images/car.png',
        title: 'Car photo',
        attribution: 'Local fallback image',
      }, 0, 'featured'),
      carImages: [],
      featuredMake: 'Car API unavailable',
      carMakes: [],
      apiCount: 0,
      apiMessage: 'The car API could not load right now.',
      featuredVehicles,
      browseCategories,
    });
  }
};
