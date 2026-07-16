import { Pool } from 'pg';

const isLocalHost = (host) => !host || host === 'localhost' || host === '127.0.0.1' || host === '::1';

const getDatabaseHost = () => {
  if (process.env.DATABASE_URL) {
    try {
      return new URL(process.env.DATABASE_URL).hostname;
    } catch {
      return null;
    }
  }

  return process.env.PGHOST;
};

const useSsl = !isLocalHost(getDatabaseHost());
const sslConfig = useSsl ? { rejectUnauthorized: false } : false;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
    }
  : {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 6432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: sslConfig,
    };

export const pool = new Pool(poolConfig);

export const ensureUsersTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'customer'
        CHECK (role IN ('customer', 'employee', 'owner'))
    )
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(150)`);

  const hasLegacyNameColumns = await pool.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name = 'first_name'
    ) AS has_legacy_name_columns
  `);

  if (hasLegacyNameColumns.rows[0]?.has_legacy_name_columns) {
    await pool.query(`
      UPDATE users
      SET name = COALESCE(
        NULLIF(name, ''),
        NULLIF(btrim(concat_ws(' ', first_name, middle_name, last_name)), ''),
        email
      )
    `);
  } else {
    await pool.query(`
      UPDATE users
      SET name = COALESCE(NULLIF(name, ''), email)
      WHERE name IS NULL OR btrim(name) = ''
    `);
  }

  await pool.query(`ALTER TABLE users ALTER COLUMN name SET NOT NULL`);
  await pool.query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`);
  await pool.query(`
    UPDATE users
    SET role = CASE
      WHEN role = 'admin' THEN 'owner'
      WHEN role = 'user' OR role IS NULL THEN 'customer'
      ELSE role
    END
  `);
  await pool.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'customer'`);
  await pool.query(`
    ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('customer', 'employee', 'owner'))
  `);
};

const columnExists = async (tableName, columnName) => {
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    ) AS exists`,
    [tableName, columnName]
  );

  return Boolean(result.rows[0]?.exists);
};

export const ensureInventoryTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      description TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id SERIAL PRIMARY KEY,
      category_id INT NOT NULL REFERENCES categories(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
      make VARCHAR(80) NOT NULL,
      model VARCHAR(80) NOT NULL,
      year INT NOT NULL CHECK (year >= 1900 AND year <= 2100),
      price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
      mileage INT NOT NULL DEFAULT 0 CHECK (mileage >= 0),
      description TEXT,
      availability BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS vehicle_images (
      id SERIAL PRIMARY KEY,
      vehicle_id INT NOT NULL REFERENCES vehicles(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);

  await pool.query(`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS availability BOOLEAN`);
  if (await columnExists('vehicles', 'is_available')) {
    await pool.query(`
      UPDATE vehicles
      SET availability = COALESCE(is_available, TRUE)
      WHERE availability IS NULL
    `);
  }

  await pool.query(`UPDATE vehicles SET availability = TRUE WHERE availability IS NULL`);
  await pool.query(`ALTER TABLE vehicles ALTER COLUMN availability SET DEFAULT TRUE`);
  await pool.query(`ALTER TABLE vehicles ALTER COLUMN availability SET NOT NULL`);

  await pool.query(`ALTER TABLE vehicle_images ADD COLUMN IF NOT EXISTS is_primary BOOLEAN`);
  await pool.query(`UPDATE vehicle_images SET is_primary = TRUE WHERE is_primary IS NULL`);
  await pool.query(`ALTER TABLE vehicle_images ALTER COLUMN is_primary SET DEFAULT FALSE`);
  await pool.query(`ALTER TABLE vehicle_images ALTER COLUMN is_primary SET NOT NULL`);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_vehicle_primary_image
    ON vehicle_images(vehicle_id)
    WHERE is_primary = TRUE
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_id ON vehicle_images(vehicle_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_vehicles_category_id ON vehicles(category_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
      vehicle_id INT NOT NULL REFERENCES vehicles(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
      rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS comment TEXT`);
  await pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS body TEXT`);

  await pool.query(`
    UPDATE reviews
    SET comment = body
    WHERE comment IS NULL
      AND body IS NOT NULL
  `);

  await pool.query(`
    UPDATE reviews
    SET body = comment
    WHERE body IS NULL
      AND comment IS NOT NULL
  `);

  await pool.query(`UPDATE reviews SET body = '' WHERE body IS NULL`);
  await pool.query(`ALTER TABLE reviews ALTER COLUMN body SET NOT NULL`);
  await pool.query(`UPDATE reviews SET comment = '' WHERE comment IS NULL`);
  await pool.query(`ALTER TABLE reviews ALTER COLUMN comment SET NOT NULL`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_vehicle_id ON reviews(vehicle_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)`);
};

export const ensureContactMessagesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(40),
      subject VARCHAR(180),
      message TEXT NOT NULL,
      rating INT CHECK (rating BETWEEN 1 AND 5),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS phone VARCHAR(40)`);
  await pool.query(`ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS rating INT`);
  await pool.query(`
    ALTER TABLE contact_messages
    DROP CONSTRAINT IF EXISTS contact_messages_rating_check
  `);
  await pool.query(`
    ALTER TABLE contact_messages
    ADD CONSTRAINT contact_messages_rating_check
    CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
  `);
};

export const ensureServiceRequestsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS service_requests (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
      vehicle_id INT REFERENCES vehicles(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
      service_type VARCHAR(80) NOT NULL,
      notes TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'Submitted',
      employee_notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS vehicle_id INT`);
  await pool.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS service_type VARCHAR(80)`);
  await pool.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS notes TEXT`);
  await pool.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS status VARCHAR(20)`);
  await pool.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS employee_notes TEXT`);
  await pool.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP`);
  await pool.query(`ALTER TABLE service_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`);

  await pool.query(`UPDATE service_requests SET status = 'Submitted' WHERE status IS NULL`);
  await pool.query(`
    UPDATE service_requests
    SET status = CASE
      WHEN lower(btrim(status)) IN ('submitted', 'new', 'open', 'pending') THEN 'Submitted'
      WHEN lower(btrim(status)) IN ('in progress', 'in_progress', 'processing', 'assigned') THEN 'In Progress'
      WHEN lower(btrim(status)) IN ('completed', 'done', 'closed', 'resolved') THEN 'Completed'
      ELSE 'Submitted'
    END
  `);
  await pool.query(`UPDATE service_requests SET service_type = 'General Service' WHERE service_type IS NULL OR btrim(service_type) = ''`);
  await pool.query(`UPDATE service_requests SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL`);
  await pool.query(`UPDATE service_requests SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL`);

  await pool.query(`ALTER TABLE service_requests ALTER COLUMN service_type SET NOT NULL`);
  await pool.query(`ALTER TABLE service_requests ALTER COLUMN status SET DEFAULT 'Submitted'`);
  await pool.query(`ALTER TABLE service_requests ALTER COLUMN status SET NOT NULL`);
  await pool.query(`ALTER TABLE service_requests ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP`);
  await pool.query(`ALTER TABLE service_requests ALTER COLUMN created_at SET NOT NULL`);
  await pool.query(`ALTER TABLE service_requests ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP`);
  await pool.query(`ALTER TABLE service_requests ALTER COLUMN updated_at SET NOT NULL`);

  await pool.query(`ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_status_check`);
  await pool.query(`
    ALTER TABLE service_requests
    ADD CONSTRAINT service_requests_status_check
    CHECK (status IN ('Submitted', 'In Progress', 'Completed'))
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status)`);
};
