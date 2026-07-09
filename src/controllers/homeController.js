// Controller = the brain that handles home page logic

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

export const getHome = async (req, res) => {
  try {
    const [makeResponse, imageResponse] = await Promise.all([
      fetch(carApiUrl),
      fetch(carImageApiUrl),
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

    req.session.carShowcase = [featuredCar, ...galleryCars];

    res.render('home', {
      title: 'Car Franchise',
      featuredCar,
      carImages: galleryCars,
      featuredMake,
      carMakes: pickRandomItems(carMakes, 6),
      apiCount: makeData.Count ?? carMakes.length,
      apiMessage: makeData.Message ?? 'Live car data fetched from NHTSA.',
    });
  } catch (error) {
    console.error('Home API error:', error);

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
    });
  }
};
