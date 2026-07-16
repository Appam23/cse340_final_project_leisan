import { pool } from '../config/database.js';

export const findUserByEmail = async (email) => {
  const result = await pool.query(
    `SELECT id, name, email, password_hash, role
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
};

export const findUserById = async (id) => {
  const result = await pool.query(
    `SELECT id, name, email, role
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  return result.rows[0] || null;
};

export const findAllUsers = async () => {
  const result = await pool.query(
    `SELECT id, name, email, role
     FROM users
     ORDER BY id ASC`
  );

  return result.rows;
};

export const updateUserById = async ({
  id,
  name,
  email,
  role,
}) => {
  const result = await pool.query(
    `UPDATE users
     SET name = $1,
         email = $2,
         role = $3
     WHERE id = $4
     RETURNING id, name, email, role`,
    [name, email, role, id]
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
     RETURNING id, name, email, role`,
    [role, id]
  );

  return result.rows[0] || null;
};

export const createUser = async ({
  firstName,
  middleName = null,
  lastName,
  name,
  email,
  passwordHash,
  role = 'customer',
}) => {
  const resolvedName = name || [firstName, middleName, lastName].filter(Boolean).join(' ');
  const resolvedFirstName = firstName || (resolvedName.split(/\s+/).filter(Boolean)[0] || 'User');
  const resolvedLastName = lastName || (resolvedName.split(/\s+/).filter(Boolean).slice(1).join(' ') || 'User');

  try {
    const result = await pool.query(
      `INSERT INTO users (first_name, middle_name, last_name, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, email, role`,
      [resolvedFirstName, middleName, resolvedLastName, resolvedName, email, passwordHash, role]
    );

    return result.rows[0];
  } catch (error) {
    // Some environments use the simplified users schema without first_name/last_name.
    if (error?.code !== '42703') {
      throw error;
    }

    const fallbackResult = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [resolvedName, email, passwordHash, role]
    );

    return fallbackResult.rows[0];
  }
};