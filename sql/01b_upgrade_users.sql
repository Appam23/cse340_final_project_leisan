UPDATE users
SET role = 'customer'
WHERE role IS NULL OR role NOT IN ('customer', 'employee', 'owner');

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('customer', 'employee', 'owner'));