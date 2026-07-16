const UNSPLASH_SEARCH_URL = 'https://api.unsplash.com/search/photos';
const OPENVERSE_SEARCH_URL = 'https://api.openverse.org/v1/images/';
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

const imageCache = new Map();

const getCacheKey = ({ year, make, model }) => `${year || ''}|${make || ''}|${model || ''}`.toLowerCase();

const getSearchQuery = ({ year, make, model }) => `${year || ''} ${make || ''} ${model || ''} car`.trim();

const getSearchQueries = ({ year, make, model }) => {
  const queries = [
    `${year || ''} ${make || ''} ${model || ''} car`.trim(),
    `${make || ''} ${model || ''} car`.trim(),
    `${make || ''} car`.trim(),
    'car',
  ];

  return [...new Set(queries.filter(Boolean))];
};

const createHash = (value) => {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
};

const readCache = (key) => {
  const cached = imageCache.get(key);

  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    imageCache.delete(key);
    return null;
  }

  return cached.url;
};

const writeCache = (key, url) => {
  imageCache.set(key, {
    url,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
};

const fetchUnsplashImage = async (vehicle) => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return null;
  }

  const cacheKey = getCacheKey(vehicle);
  const queries = getSearchQueries(vehicle);

  for (const query of queries) {
    const searchParams = new URLSearchParams({
      query,
      per_page: '10',
      orientation: 'landscape',
      content_filter: 'high',
    });

    try {
      const response = await fetch(`${UNSPLASH_SEARCH_URL}?${searchParams.toString()}`, {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          'Accept-Version': 'v1',
        },
      });

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      const photos = Array.isArray(payload.results) ? payload.results : [];

      if (photos.length === 0) {
        continue;
      }

      const photo = photos[createHash(`${cacheKey}|${query}`) % photos.length];
      const imageUrl = photo?.urls?.regular || photo?.urls?.small || photo?.urls?.thumb || null;

      if (imageUrl) {
        return imageUrl;
      }
    } catch {
      continue;
    }
  }

  return null;
};

export const getVehicleImageFromApi = async (vehicle) => {
  const cacheKey = getCacheKey(vehicle);
  const cachedUrl = readCache(cacheKey);

  if (cachedUrl) {
    return cachedUrl;
  }

  const onlineImageUrl = await fetchUnsplashImage(vehicle) || await fetchOpenverseImage(vehicle);

  if (onlineImageUrl) {
    writeCache(cacheKey, onlineImageUrl);
  }

  return onlineImageUrl;
};

const fetchOpenverseImage = async (vehicle) => {
  const cacheKey = getCacheKey(vehicle);
  const queries = getSearchQueries(vehicle);

  for (const query of queries) {
    const searchParams = new URLSearchParams({
      q: query,
      page_size: '10',
    });

    try {
      const response = await fetch(`${OPENVERSE_SEARCH_URL}?${searchParams.toString()}`);

      if (!response.ok) {
        continue;
      }

      const payload = await response.json();
      const images = Array.isArray(payload.results) ? payload.results : [];

      if (images.length === 0) {
        continue;
      }

      const image = images[createHash(`${cacheKey}|${query}`) % images.length];
      const imageUrl = image?.thumbnail || image?.url || null;

      if (imageUrl) {
        return imageUrl;
      }
    } catch {
      continue;
    }
  }

  return null;
};
