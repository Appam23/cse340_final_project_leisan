import { pool } from '../config/database.js';

export const findUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT id, first_name, middle_name, last_name, email, password_hash, role
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
};

export const findUserById = async (id) => {
  const result = await pool.query(
    `SELECT id, first_name, middle_name, last_name, email, role
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
};

export const findAllUsers = async () => {
  const result = await pool.query(
    `SELECT id, first_name, middle_name, last_name, email, role, created_at
     FROM users
     ORDER BY id ASC`
  );

  return result.rows;
};

export const updateUserById = async ({
  id,
  firstName,
  middleName,
  lastName,
  email,
  role,
}) => {
  const result = await pool.query(
    `UPDATE users
     SET first_name = $1,
         middle_name = $2,
         last_name = $3,
         email = $4,
         role = $5
     WHERE id = $6
     RETURNING id, first_name, middle_name, last_name, email, role`,
    [firstName, middleName, lastName, email, role, id]
  );

  return result.rows[0] || null;
};

export const deleteUserById = async (id) => {
  const result = await pool.query(
    `DELETE FROM users
     WHERE id = $1
     RETURNING id`,
    [id]
  );

  return result.rows[0] || null;
};

export const updateUserRoleById = async (id, role) => {
  const result = await pool.query(
    `UPDATE users
     SET role = $1
     WHERE id = $2
     RETURNING id, first_name, middle_name, last_name, email, role`,
    [role, id]
  );

  return result.rows[0] || null;
};

export const createUser = async ({
  firstName,
  middleName,
  lastName,
  email,
  passwordHash,
  role = 'user',
}) => {
  const result = await pool.query(
    `INSERT INTO users (first_name, middle_name, last_name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, first_name, middle_name, last_name, email, role`,
    [firstName, middleName, lastName, email, passwordHash, role]
  );

  return result.rows[0];
};