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

export async function getAllVehicles() {
  const sql = `
    SELECT
      v.id,
      v.year,
      v.make,
      v.model,
      v.trim,
      v.price,
      v.mileage,
      v.is_available,
      v.featured,
      c.name AS category_name,
      ${vehicleImageSelect}
    FROM vehicles v
    INNER JOIN categories c
      ON c.id = v.category_id
    LEFT JOIN vehicle_images vi
      ON vi.vehicle_id = v.id
     AND vi.is_primary = true
    ORDER BY v.created_at DESC, v.id DESC
  `;

  const { rows } = await pool.query(sql);
  return rows;
}

export async function createVehicle(vehicleData) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertVehicleSql = `
      INSERT INTO vehicles (
        category_id,
        year,
        make,
        model,
        trim,
        mileage,
        vin,
        color,
        transmission,
        fuel_type,
        drivetrain,
        engine,
        description,
        price,
        is_available,
        featured
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING id
    `;

    const vehicleValues = [
      vehicleData.categoryId,
      vehicleData.year,
      vehicleData.make,
      vehicleData.model,
      vehicleData.trim || null,
      vehicleData.mileage,
      vehicleData.vin || null,
      vehicleData.color || null,
      vehicleData.transmission || null,
      vehicleData.fuelType || null,
      vehicleData.drivetrain || null,
      vehicleData.engine || null,
      vehicleData.description || null,
      vehicleData.price,
      vehicleData.isAvailable,
      vehicleData.featured,
    ];

    const insertedVehicle = await client.query(insertVehicleSql, vehicleValues);
    const vehicleId = insertedVehicle.rows[0].id;

    if (vehicleData.imageUrl) {
      const insertImageSql = `
        INSERT INTO vehicle_images (
          vehicle_id,
          image_url,
          alt_text,
          sort_order,
          is_primary
        ) VALUES ($1, $2, $3, 0, true)
      `;

      await client.query(insertImageSql, [
        vehicleId,
        vehicleData.imageUrl,
        vehicleData.altText || `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`,
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
        year = $2,
        make = $3,
        model = $4,
        trim = $5,
        mileage = $6,
        vin = $7,
        color = $8,
        transmission = $9,
        fuel_type = $10,
        drivetrain = $11,
        engine = $12,
        description = $13,
        price = $14,
        is_available = $15,
        featured = $16,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
      RETURNING id
    `;

    const updateValues = [
      vehicleData.categoryId,
      vehicleData.year,
      vehicleData.make,
      vehicleData.model,
      vehicleData.trim || null,
      vehicleData.mileage,
      vehicleData.vin || null,
      vehicleData.color || null,
      vehicleData.transmission || null,
      vehicleData.fuelType || null,
      vehicleData.drivetrain || null,
      vehicleData.engine || null,
      vehicleData.description || null,
      vehicleData.price,
      vehicleData.isAvailable,
      vehicleData.featured,
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
          alt_text,
          sort_order,
          is_primary
        ) VALUES ($1, $2, $3, 0, true)
      `;

      await client.query(insertImageSql, [
        vehicleId,
        vehicleData.imageUrl,
        vehicleData.altText || `${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`,
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
      v.year,
      v.make,
      v.model,
      v.trim,
      v.price,
      v.mileage,
      v.vin,
      v.color,
      v.transmission,
      v.fuel_type,
      v.drivetrain,
      v.engine,
      v.description,
      v.is_available,
      v.featured,
      vi.image_url AS raw_image_url,
      vi.alt_text AS raw_alt_text,
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