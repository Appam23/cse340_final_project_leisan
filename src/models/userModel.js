import { pool } from '../config/database.js';

export const findUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT id, first_name, middle_name, last_name, email, password_hash
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
};

export const findUserById = async (id) => {
  const result = await pool.query(
    `SELECT id, first_name, middle_name, last_name, email
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
};

export const createUser = async ({
  firstName,
  middleName,
  lastName,
  email,
  passwordHash,
}) => {
  const result = await pool.query(
    `INSERT INTO users (first_name, middle_name, last_name, email, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, first_name, middle_name, last_name, email`,
    [firstName, middleName, lastName, email, passwordHash]
  );

  return result.rows[0];
};