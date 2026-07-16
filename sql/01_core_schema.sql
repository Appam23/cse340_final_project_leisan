-- =========================================================
-- CSE340 Final Project - Core Schema
-- Step 1: Create all required tables and relationships
-- =========================================================

-- Optional: helps with case-insensitive email uniqueness
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------
-- USERS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'employee', 'owner'))
);

-- ---------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT
);

-- ---------------------------------------------------------
-- VEHICLES
-- ---------------------------------------------------------
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
);

CREATE INDEX IF NOT EXISTS idx_vehicles_category_id
  ON vehicles(category_id);

-- ---------------------------------------------------------
-- VEHICLE IMAGES (one-to-many)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_images (
  id SERIAL PRIMARY KEY,
  vehicle_id INT NOT NULL REFERENCES vehicles(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_id
  ON vehicle_images(vehicle_id);

-- Optional: only one primary image per vehicle
CREATE UNIQUE INDEX IF NOT EXISTS ux_vehicle_primary_image
  ON vehicle_images(vehicle_id)
  WHERE is_primary = TRUE;

-- ---------------------------------------------------------
-- REVIEWS
-- ---------------------------------------------------------
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
);

CREATE INDEX IF NOT EXISTS idx_reviews_vehicle_id ON reviews(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- ---------------------------------------------------------
-- SERVICE REQUESTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_requests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  vehicle_id INT REFERENCES vehicles(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  service_type VARCHAR(80) NOT NULL,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Submitted'
    CHECK (status IN ('Submitted', 'In Progress', 'Completed')),
  employee_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

-- ---------------------------------------------------------
-- CONTACT MESSAGES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email CITEXT NOT NULL,
  phone VARCHAR(40),
  subject VARCHAR(180),
  message TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
