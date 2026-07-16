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
        v.description,
        v.availability,
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
      v.description,
      v.availability,
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

export async function getCategoryById(categoryId) {
  const sql = `
    SELECT id, name, description
    FROM categories
    WHERE id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(sql, [categoryId]);
  return rows[0] || null;
}

export async function getCategoriesWithVehicleCounts() {
  const sql = `
    SELECT
      c.id,
      c.name,
      c.description,
      COUNT(v.id)::int AS vehicle_count
    FROM categories c
    LEFT JOIN vehicles v
      ON v.category_id = c.id
    GROUP BY c.id, c.name, c.description
    ORDER BY c.name ASC
  `;

  const { rows } = await pool.query(sql);
  return rows;
}

export async function createCategory({ name, description }) {
  const sql = `
    INSERT INTO categories (name, description)
    VALUES ($1, $2)
    RETURNING id, name, description
  `;

  const { rows } = await pool.query(sql, [name, description || null]);
  return rows[0] || null;
}

export async function updateCategoryById({ categoryId, name, description }) {
  const sql = `
    UPDATE categories
    SET name = $1,
        description = $2
    WHERE id = $3
    RETURNING id, name, description
  `;

  const { rows } = await pool.query(sql, [name, description || null, categoryId]);
  return rows[0] || null;
}

export async function deleteCategoryById(categoryId) {
  const sql = `
    DELETE FROM categories
    WHERE id = $1
    RETURNING id
  `;

  const { rows } = await pool.query(sql, [categoryId]);
  return rows[0] || null;
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
      v.description,
      v.availability,
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

export async function getAllVehicles() {
  const sql = `
    SELECT
      v.id,
      v.category_id,
      v.year,
      v.make,
      v.model,
      v.price,
      v.mileage,
      v.description,
      v.availability,
      c.name AS category_name,
      ${vehicleImageSelect}
    FROM vehicles v
    INNER JOIN categories c
      ON c.id = v.category_id
    LEFT JOIN vehicle_images vi
      ON vi.vehicle_id = v.id
     AND vi.is_primary = true
    ORDER BY v.id DESC
  `;

  const { rows } = await pool.query(sql);
  return rows;
}

export async function getFeaturedVehicles(limit = 4) {
  const sql = `
    SELECT
      v.id,
      v.year,
      v.make,
      v.model,
      v.price,
      v.mileage,
      v.description,
      v.availability,
      c.name AS category_name,
      ${vehicleImageSelect}
    FROM vehicles v
    INNER JOIN categories c
      ON c.id = v.category_id
    LEFT JOIN vehicle_images vi
      ON vi.vehicle_id = v.id
     AND vi.is_primary = true
    WHERE v.availability = TRUE
    ORDER BY v.id DESC
    LIMIT $1
  `;

  const { rows } = await pool.query(sql, [limit]);
  return rows;
}

export async function createVehicle(vehicleData) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertVehicleSql = `
      INSERT INTO vehicles (
        category_id,
        make,
        model,
        year,
        price,
        mileage,
        description,
        availability
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
      RETURNING id
    `;

    const vehicleValues = [
      vehicleData.categoryId,
      vehicleData.make,
      vehicleData.model,
      vehicleData.year,
      vehicleData.price,
      vehicleData.mileage,
      vehicleData.description || null,
      vehicleData.availability,
    ];

    const insertedVehicle = await client.query(insertVehicleSql, vehicleValues);
    const vehicleId = insertedVehicle.rows[0].id;

    if (vehicleData.imageUrl) {
      const insertImageSql = `
        INSERT INTO vehicle_images (
          vehicle_id,
          image_url,
          is_primary
        ) VALUES ($1, $2, true)
      `;

      await client.query(insertImageSql, [
        vehicleId,
        vehicleData.imageUrl,
      ]);
    }

    await client.query('COMMIT');
    return vehicleId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateVehicleById(vehicleId, vehicleData) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updateVehicleSql = `
      UPDATE vehicles
      SET
        category_id = $1,
        make = $2,
        model = $3,
        year = $4,
        price = $5,
        mileage = $6,
        description = $7,
        availability = $8
      WHERE id = $9
      RETURNING id
    `;

    const updateValues = [
      vehicleData.categoryId,
      vehicleData.make,
      vehicleData.model,
      vehicleData.year,
      vehicleData.price,
      vehicleData.mileage,
      vehicleData.description || null,
      vehicleData.availability,
      vehicleId,
    ];

    const updatedVehicle = await client.query(updateVehicleSql, updateValues);

    if (updatedVehicle.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('DELETE FROM vehicle_images WHERE vehicle_id = $1', [vehicleId]);

    if (vehicleData.imageUrl) {
      const insertImageSql = `
        INSERT INTO vehicle_images (
          vehicle_id,
          image_url,
          is_primary
        ) VALUES ($1, $2, true)
      `;

      await client.query(insertImageSql, [
        vehicleId,
        vehicleData.imageUrl,
      ]);
    }

    await client.query('COMMIT');
    return updatedVehicle.rows[0].id;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteVehicleById(vehicleId) {
  const sql = `
    DELETE FROM vehicles
    WHERE id = $1
    RETURNING id
  `;

  const { rows, rowCount } = await pool.query(sql, [vehicleId]);

  if (rowCount === 0) {
    return null;
  }

  return rows[0].id;
}

export async function getVehicleById(id) {
  const sql = `
    SELECT
      v.id,
      v.category_id,
      c.name AS category_name,
      v.year,
      v.make,
      v.model,
      v.price,
      v.mileage,
      v.description,
      v.availability,
      vi.image_url AS raw_image_url,
      ${vehicleImageSelect}
    FROM vehicles v
    LEFT JOIN categories c
      ON c.id = v.category_id
    LEFT JOIN vehicle_images vi
      ON vi.vehicle_id = v.id
     AND vi.is_primary = true
    WHERE v.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(sql, [id]);
  return rows[0] || null;
}