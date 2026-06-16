// Controller = the brain that handles home page logic

const carApiUrl = 'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json';
const carImageApiUrl = 'https://api.openverse.org/v1/images/?q=car&per_page=20';

const pickRandomItems = (items, count) => {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const pickRandomItem = (items) => items[Math.floor(Math.random() * items.length)];

const toDataUri = async (imageUrl) => {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Image fetch failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());

  return `data:${contentType};base64,${buffer.toString('base64')}`;
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

    const featuredImageSrc = featuredImage.src.startsWith('/')
      ? featuredImage.src
      : await toDataUri(featuredImage.src);

    const galleryImages = await Promise.all(
      pickRandomItems(carImages, 6).map(async (image) => ({
        src: image.src.startsWith('/')
          ? image.src
          : await toDataUri(image.src),
        title: image.title,
        attribution: image.attribution,
      }))
    );

    res.render('home', {
      title: 'Car Franchise',
      carImage: featuredImageSrc,
      carImageTitle: featuredImage.title,
      carImageAttribution: featuredImage.attribution,
      carImages: galleryImages,
      featuredMake,
      carMakes: pickRandomItems(carMakes, 6),
      apiCount: makeData.Count ?? carMakes.length,
      apiMessage: makeData.Message ?? 'Live car data fetched from NHTSA.',
    });
  } catch (error) {
    console.error('Home API error:', error);

    res.render('home', {
      title: 'Car Franchise',
      carImage: '/images/car.png',
      carImageTitle: 'Car photo',
      carImageAttribution: 'Local fallback image',
      carImages: [],
      featuredMake: 'Car API unavailable',
      carMakes: [],
      apiCount: 0,
      apiMessage: 'The car API could not load right now.',
    });
  }
};
