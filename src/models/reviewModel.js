import { pool } from '../config/database.js';

export const getReviewsByVehicleId = async (vehicleId) => {
  const result = await pool.query(
    `SELECT
      r.id,
      r.user_id,
      r.vehicle_id,
      r.rating,
      COALESCE(NULLIF(r.comment, ''), r.body) AS comment,
      r.created_at,
      r.updated_at,
      u.name AS user_name
     FROM reviews r
     INNER JOIN users u
       ON u.id = r.user_id
     WHERE r.vehicle_id = $1
     ORDER BY r.created_at DESC, r.id DESC`,
    [vehicleId]
  );

  return result.rows;
};

export const getReviewById = async (reviewId) => {
  const result = await pool.query(
    `SELECT
      id,
      user_id,
      vehicle_id,
      rating,
      COALESCE(NULLIF(comment, ''), body) AS comment,
      created_at,
      updated_at
     FROM reviews
     WHERE id = $1
     LIMIT 1`,
    [reviewId]
  );

  return result.rows[0] || null;
};

export const createReview = async ({ userId, vehicleId, rating, comment }) => {
  try {
    const result = await pool.query(
      `INSERT INTO reviews (user_id, vehicle_id, rating, comment, body)
       VALUES ($1, $2, $3, $4, $4)
       RETURNING
         id,
         user_id,
         vehicle_id,
         rating,
         COALESCE(NULLIF(comment, ''), body) AS comment,
         created_at,
         updated_at`,
      [userId, vehicleId, rating, comment]
    );

    if (!result.rows[0]) {
      return null;
    }

    return {
      ...result.rows[0],
      wasUpdated: false,
    };
  } catch (error) {
    if (error?.code !== '23505') {
      throw error;
    }

    const updateResult = await pool.query(
      `UPDATE reviews
       SET rating = $1,
           comment = $2,
           body = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3
         AND vehicle_id = $4
       RETURNING
         id,
         user_id,
         vehicle_id,
         rating,
         COALESCE(NULLIF(comment, ''), body) AS comment,
         created_at,
         updated_at`,
      [rating, comment, userId, vehicleId]
    );

    if (!updateResult.rows[0]) {
      return null;
    }

    return {
      ...updateResult.rows[0],
      wasUpdated: true,
    };
  }
};

export const updateReviewByIdForUser = async ({ reviewId, userId, rating, comment }) => {
  const result = await pool.query(
    `UPDATE reviews
     SET rating = $1,
         comment = $2,
         body = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3
       AND user_id = $4
     RETURNING
       id,
       user_id,
       vehicle_id,
       rating,
       COALESCE(NULLIF(comment, ''), body) AS comment,
       created_at,
       updated_at`,
    [rating, comment, reviewId, userId]
  );

  return result.rows[0] || null;
};

export const deleteReviewByIdForUser = async ({ reviewId, userId }) => {
  const result = await pool.query(
    `DELETE FROM reviews
     WHERE id = $1
       AND user_id = $2
     RETURNING id`,
    [reviewId, userId]
  );

  return result.rows[0] || null;
};

export const getAllReviews = async () => {
  const result = await pool.query(
    `SELECT
      r.id,
      r.user_id,
      r.vehicle_id,
      r.rating,
      COALESCE(NULLIF(r.comment, ''), r.body) AS comment,
      r.created_at,
      r.updated_at,
      u.name AS user_name,
      u.email AS user_email,
      CONCAT_WS(' ', v.year, v.make, v.model) AS vehicle_name
     FROM reviews r
     INNER JOIN users u
       ON u.id = r.user_id
     LEFT JOIN vehicles v
       ON v.id = r.vehicle_id
     ORDER BY r.created_at DESC, r.id DESC`
  );

  return result.rows;
};

export const deleteReviewById = async (reviewId) => {
  const result = await pool.query(
    `DELETE FROM reviews
     WHERE id = $1
     RETURNING id`,
    [reviewId]
  );

  return result.rows[0] || null;
};
