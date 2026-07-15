-- =========================================================
-- CSE340 Final Project - Core Schema
-- Step 1: Create all required tables and relationships
-- =========================================================

-- Optional: helps with case-insensitive email uniqueness
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------
-- USERS
-- ---------------------------------------------------------
-- Keep your existing users table if already created.
-- This version expands role support for user/employee/owner.
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  email CITEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'employee', 'owner')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- Trucks, Vans, Cars, SUVs
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------
-- VEHICLES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  category_id INT NOT NULL REFERENCES categories(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  year INT NOT NULL CHECK (year >= 1900 AND year <= 2100),
  make VARCHAR(80) NOT NULL,
  model VARCHAR(80) NOT NULL,
  trim VARCHAR(80),
  mileage INT NOT NULL DEFAULT 0 CHECK (mileage >= 0),
  vin VARCHAR(17) UNIQUE,
  color VARCHAR(40),
  transmission VARCHAR(40),
  fuel_type VARCHAR(40),
  drivetrain VARCHAR(40), -- AWD/FWD/RWD/4WD
  engine VARCHAR(80),
  description TEXT,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Helpful unique constraint for duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS ux_vehicle_identity
  ON vehicles (year, make, model, COALESCE(trim, ''));

-- ---------------------------------------------------------
-- VEHICLE IMAGES (one-to-many)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_images (
  id SERIAL PRIMARY KEY,
  vehicle_id INT NOT NULL REFERENCES vehicles(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  title VARCHAR(120),
  body TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT TRUE, -- employee can moderate
  moderated_by INT REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  moderated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_vehicle_id ON reviews(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);

-- Optional rule: one review per user per vehicle
CREATE UNIQUE INDEX IF NOT EXISTS ux_review_user_vehicle
  ON reviews(user_id, vehicle_id);

-- ---------------------------------------------------------
-- SERVICE REQUESTS
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_requests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  vehicle_id INT REFERENCES vehicles(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  request_type VARCHAR(40) NOT NULL
    CHECK (request_type IN ('oil_change', 'inspection', 'tire_rotation', 'brake_service', 'other')),
  description TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'in_progress', 'completed', 'cancelled')),
  employee_note TEXT,
  updated_by INT REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

-- ---------------------------------------------------------
-- CONTACT MESSAGES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL, -- null for public/guest submissions
  name VARCHAR(120) NOT NULL,
  email CITEXT NOT NULL,
  subject VARCHAR(180),
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'read', 'resolved', 'archived')),
  handled_by INT REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  handled_note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);

-- ---------------------------------------------------------
-- OPTIONAL: ACTIVITY LOGS (owner dashboard visibility)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INT REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,        -- e.g. "vehicle.update", "review.delete"
  target_table VARCHAR(60),            -- e.g. vehicles/reviews/service_requests
  target_id INT,
  details JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_actor ON activity_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);