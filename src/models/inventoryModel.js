import { pool } from '../config/database.js';

const vehicleImageSelect = `
  CASE
    WHEN vi.image_url IS NULL OR btrim(vi.image_url) = '' THEN '/images/car.png'
    WHEN vi.image_url ILIKE 'http://%' THEN regexp_replace(vi.image_url, '^http://', 'https://')
    WHEN vi.image_url ~* '^https://.*' THEN vi.image_url
    WHEN vi.image_url LIKE '/%' THEN vi.image_url
    WHEN vi.image_url ILIKE 'images/%' THEN '/' || vi.image_url
    ELSE '/images/car.png'
  END AS image_url
`;

export async function getVehicles(search = '') {
  if (search && search.trim() !== '') {
    const sql = `
      SELECT
        v.id,
        v.year,
        v.make,
        v.model,
        v.price,
        v.mileage,
        ${vehicleImageSelect}
      FROM vehicles v
      LEFT JOIN vehicle_images vi
        ON vi.vehicle_id = v.id
       AND vi.is_primary = true
      WHERE v.make ILIKE $1 OR v.model ILIKE $1
      ORDER BY v.make, v.model, v.year DESC
      LIMIT 12
    `;
    const values = [`%${search.trim()}%`];
    const { rows } = await pool.query(sql, values);
    return rows;
  }

  const sql = `
    SELECT
      v.id,
      v.year,
      v.make,
      v.model,
      v.price,
      v.mileage,
      ${vehicleImageSelect}
    FROM vehicles v
    LEFT JOIN vehicle_images vi
      ON vi.vehicle_id = v.id
     AND vi.is_primary = true
    ORDER BY v.make, v.model, v.year DESC
    LIMIT 12
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

export async function getCategories() {
  const sql = `
    SELECT id, name
    FROM categories
    ORDER BY name ASC
  `;

  const { rows } = await pool.query(sql);
  return rows;
}

export async function getVehiclesByCategory(categoryName) {
  const sql = `
    SELECT
      v.id,
      v.year,
      v.make,
      v.model,
      v.price,
      v.mileage,
      c.name AS category_name,
      ${vehicleImageSelect}
    FROM vehicles v
    INNER JOIN categories c
      ON c.id = v.category_id
    LEFT JOIN vehicle_images vi
      ON vi.vehicle_id = v.id
     AND vi.is_primary = true
    WHERE c.name ILIKE $1
    ORDER BY v.make, v.model, v.year DESC
  `;

  const { rows } = await pool.query(sql, [categoryName]);
  return rows;
}

export async function getVehicleById(id) {
  const sql = `
    SELECT
      v.id,
      v.year,
      v.make,
      v.model,
      v.price,
      v.mileage,
      v.description,
      ${vehicleImageSelect}
    FROM vehicles v
    LEFT JOIN vehicle_images vi
      ON vi.vehicle_id = v.id
     AND vi.is_primary = true
    WHERE v.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(sql, [id]);
  return rows[0] || null;
}