-- =========================================================
-- CSE340 Final Project - Seed User Activity
-- Adds sample reviews, service requests, and contact messages
-- Safe to run multiple times (uses NOT EXISTS guards)
-- =========================================================

-- ---------------------------------------------------------
-- REVIEWS
-- one review per (user, vehicle) due to ux_review_user_vehicle
-- ---------------------------------------------------------
INSERT INTO reviews (user_id, vehicle_id, rating, title, body, is_approved, created_at, updated_at)
SELECT u.id, v.id, r.rating, r.title, r.body, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  VALUES
    ('lei21014@byui.edu',  'Toyota',        'RAV4',      5, 'Great daily SUV', 'Very reliable and comfortable for commuting.'),
    ('angie@gmail.com',    'Honda',         'Accord',    4, 'Solid sedan',     'Fuel efficient and smooth ride.'),
    ('trazhgim@gmail.com', 'Ford',          'F-150',     5, 'Workhorse truck', 'Excellent towing and cabin space.'),
    ('lei21014@byui.edu',  'Chrysler',      'Pacifica',  4, 'Family friendly', 'Plenty of room and practical features.')
) AS r(email, make, model, rating, title, body)
JOIN users u
  ON u.email = r.email
JOIN vehicles v
  ON v.make = r.make
 AND v.model = r.model
WHERE NOT EXISTS (
  SELECT 1
  FROM reviews x
  WHERE x.user_id = u.id
    AND x.vehicle_id = v.id
);

-- ---------------------------------------------------------
-- SERVICE REQUESTS
-- ---------------------------------------------------------
INSERT INTO service_requests (user_id, vehicle_id, request_type, description, status, submitted_at, updated_at)
SELECT u.id, v.id, s.request_type, s.description, s.status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  VALUES
    ('lei21014@byui.edu',  'Toyota',   'RAV4',     'oil_change',   'Need synthetic oil change before road trip.', 'submitted'),
    ('angie@gmail.com',    'Honda',    'Accord',   'inspection',   'Pre-purchase inspection request.',             'in_progress'),
    ('trazhgim@gmail.com', 'Ford',     'F-150',    'brake_service','Brake pads making noise.',                     'submitted'),
    ('lei21014@byui.edu',  'Chrysler', 'Pacifica', 'tire_rotation','Rotate all four tires.',                       'completed')
) AS s(email, make, model, request_type, description, status)
JOIN users u
  ON u.email = s.email
JOIN vehicles v
  ON v.make = s.make
 AND v.model = s.model
WHERE NOT EXISTS (
  SELECT 1
  FROM service_requests x
  WHERE x.user_id = u.id
    AND x.vehicle_id = v.id
    AND x.request_type = s.request_type
);

-- ---------------------------------------------------------
-- CONTACT MESSAGES
-- includes one guest message (user_id NULL)
-- ---------------------------------------------------------
INSERT INTO contact_messages (user_id, name, email, subject, message, status, created_at, updated_at)
SELECT cm.user_id, cm.name, cm.email, cm.subject, cm.message, cm.status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  VALUES
    ((SELECT id FROM users WHERE email = 'lei21014@byui.edu'), 'Appam Leisan', 'lei21014@byui.edu', 'Inventory question', 'Do you have more AWD SUVs coming this month?', 'new'),
    ((SELECT id FROM users WHERE email = 'angie@gmail.com'),   'Angie',        'angie@gmail.com',   'Service follow-up',  'Can I reschedule my inspection appointment?',   'read'),
    (NULL,                                                      'Guest User',   'guest@example.com',  'Financing',          'What financing options are available?',         'new')
) AS cm(user_id, name, email, subject, message, status)
WHERE NOT EXISTS (
  SELECT 1
  FROM contact_messages x
  WHERE x.email = cm.email
    AND x.subject = cm.subject
    AND x.message = cm.message
);