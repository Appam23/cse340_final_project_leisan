import { pool } from '../config/database.js';

export const getSystemOverview = async () => {
  const [summaryResult, recentUsersResult, recentServiceRequestsResult, recentReviewsResult, recentContactMessagesResult] = await Promise.all([
    pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM users) AS users_total,
        (SELECT COUNT(*)::int FROM users WHERE role = 'owner') AS owners_total,
        (SELECT COUNT(*)::int FROM users WHERE role = 'employee') AS employees_total,
        (SELECT COUNT(*)::int FROM users WHERE role = 'customer') AS customers_total,
        (SELECT COUNT(*)::int FROM categories) AS categories_total,
        (SELECT COUNT(*)::int FROM vehicles) AS vehicles_total,
        (SELECT COUNT(*)::int FROM reviews) AS reviews_total,
        (SELECT COUNT(*)::int FROM service_requests) AS service_requests_total,
        (SELECT COUNT(*)::int FROM contact_messages) AS contact_messages_total`
    ),
    pool.query(
      `SELECT id, name, email, role
       FROM users
       ORDER BY id DESC
       LIMIT 12`
    ),
    pool.query(
      `SELECT
        sr.id,
        sr.status,
        sr.service_type,
        sr.created_at,
        u.name AS user_name,
        CONCAT_WS(' ', v.year, v.make, v.model) AS vehicle_name
       FROM service_requests sr
       INNER JOIN users u
         ON u.id = sr.user_id
       LEFT JOIN vehicles v
         ON v.id = sr.vehicle_id
       ORDER BY sr.created_at DESC, sr.id DESC
       LIMIT 12`
    ),
    pool.query(
      `SELECT
        r.id,
        r.rating,
        COALESCE(NULLIF(r.comment, ''), r.body) AS comment,
        r.created_at,
        u.name AS user_name,
        CONCAT_WS(' ', v.year, v.make, v.model) AS vehicle_name
       FROM reviews r
       INNER JOIN users u
         ON u.id = r.user_id
       LEFT JOIN vehicles v
         ON v.id = r.vehicle_id
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 12`
    ),
    pool.query(
      `SELECT
        id,
        name,
        email,
        subject,
        created_at
       FROM contact_messages
       ORDER BY created_at DESC, id DESC
       LIMIT 12`
    ),
  ]);

  return {
    summary: summaryResult.rows[0] || {
      users_total: 0,
      owners_total: 0,
      employees_total: 0,
      customers_total: 0,
      categories_total: 0,
      vehicles_total: 0,
      reviews_total: 0,
      service_requests_total: 0,
      contact_messages_total: 0,
    },
    recentUsers: recentUsersResult.rows,
    recentServiceRequests: recentServiceRequestsResult.rows,
    recentReviews: recentReviewsResult.rows,
    recentContactMessages: recentContactMessagesResult.rows,
  };
};
