import { pool } from '../config/database.js';

export const createContactMessage = async ({
  name,
  email,
  phone = null,
  subject,
  message,
  rating = null,
}) => {
  const result = await pool.query(
    `INSERT INTO contact_messages (name, email, phone, subject, message, rating)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, email, phone, subject, message, rating, created_at`,
    [name, email, phone, subject || null, message, rating]
  );

  return result.rows[0] || null;
};

export const getAllContactMessages = async () => {
  const result = await pool.query(
    `SELECT
      id,
      name,
      email,
      phone,
      subject,
      message,
      rating,
      created_at
     FROM contact_messages
     ORDER BY created_at DESC, id DESC`
  );

  return result.rows;
};
