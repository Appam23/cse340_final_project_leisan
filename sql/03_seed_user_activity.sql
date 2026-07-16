-- =========================================================
-- CSE340 Final Project - Seed User Activity
-- Adds sample reviews, service requests, and contact messages
-- Safe to run multiple times (uses NOT EXISTS guards)
-- =========================================================

-- ---------------------------------------------------------
-- REVIEWS
-- ---------------------------------------------------------
INSERT INTO reviews (user_id, vehicle_id, rating, comment, created_at, updated_at)
SELECT u.id, v.id, r.rating, r.comment, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  VALUES
    ('lei21014@byui.edu',  'Toyota',        'RAV4',      5, 'Very reliable and comfortable for commuting.'),
    ('angie@gmail.com',    'Honda',         'Accord',    4, 'Fuel efficient and smooth ride.'),
    ('trazhgim@gmail.com', 'Ford',          'F-150',     5, 'Excellent towing and cabin space.'),
    ('lei21014@byui.edu',  'Chrysler',      'Pacifica',  4, 'Plenty of room and practical features.')
) AS r(email, make, model, rating, comment)
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
INSERT INTO service_requests (user_id, vehicle_id, service_type, notes, status, employee_notes, created_at, updated_at)
SELECT u.id, v.id, s.service_type, s.notes, s.status, s.employee_notes, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  VALUES
    ('lei21014@byui.edu',  'Toyota',   'RAV4',     'Oil change',   'Need synthetic oil change before road trip.', 'Submitted',   NULL),
    ('angie@gmail.com',    'Honda',    'Accord',   'Inspection',   'Pre-purchase inspection request.',             'In Progress', NULL),
    ('trazhgim@gmail.com', 'Ford',     'F-150',    'Brake service','Brake pads making noise.',                     'Submitted',   NULL),
    ('lei21014@byui.edu',  'Chrysler', 'Pacifica', 'Tire rotation','Rotate all four tires.',                       'Completed',   NULL)
) AS s(email, make, model, service_type, notes, status, employee_notes)
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
    AND x.service_type = s.service_type
);

-- ---------------------------------------------------------
-- CONTACT MESSAGES
-- ---------------------------------------------------------
INSERT INTO contact_messages (name, email, subject, message, created_at)
SELECT cm.name, cm.email, cm.subject, cm.message, CURRENT_TIMESTAMP
FROM (
  VALUES
    ('Appam Leisan', 'lei21014@byui.edu', 'Inventory question', 'Do you have more AWD SUVs coming this month?'),
    ('Angie',        'angie@gmail.com',   'Service follow-up',  'Can I reschedule my inspection appointment?'),
    ('Guest User',   'guest@example.com',  'Financing',          'What financing options are available?')
) AS cm(name, email, subject, message)
WHERE NOT EXISTS (
  SELECT 1
  FROM contact_messages x
  WHERE x.email = cm.email
    AND x.subject = cm.subject
    AND x.message = cm.message
);