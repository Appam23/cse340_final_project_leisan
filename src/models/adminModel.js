import { pool } from '../config/database.js';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const buildPagination = ({ total, page, pageSize }) => ({
  total,
  page,
  pageSize,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});

export const getSystemOverview = async ({
  usersPage = 1,
  servicePage = 1,
  reviewsPage = 1,
  contactsPage = 1,
  pageSize = 5,
} = {}) => {
  const safePageSize = toPositiveInt(pageSize, 5);
  const safeUsersPage = toPositiveInt(usersPage, 1);
  const safeServicePage = toPositiveInt(servicePage, 1);
  const safeReviewsPage = toPositiveInt(reviewsPage, 1);
  const safeContactsPage = toPositiveInt(contactsPage, 1);

  const usersOffset = (safeUsersPage - 1) * safePageSize;
  const serviceOffset = (safeServicePage - 1) * safePageSize;
  const reviewsOffset = (safeReviewsPage - 1) * safePageSize;
  const contactsOffset = (safeContactsPage - 1) * safePageSize;

  const [
    summaryResult,
    usersTotalResult,
    usersResult,
    serviceTotalResult,
    serviceResult,
    reviewsTotalResult,
    reviewsResult,
    contactsTotalResult,
    contactsResult,
  ] = await Promise.all([
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
    pool.query(`SELECT COUNT(*)::int AS total FROM users`),
    pool.query(
      `SELECT id, name, email, role
       FROM users
       ORDER BY id DESC
       LIMIT $1
       OFFSET $2`,
      [safePageSize, usersOffset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM service_requests`),
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
       LIMIT $1
       OFFSET $2`,
      [safePageSize, serviceOffset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM reviews`),
    pool.query(
      `SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name AS user_name,
        CONCAT_WS(' ', v.year, v.make, v.model) AS vehicle_name
       FROM reviews r
       INNER JOIN users u
         ON u.id = r.user_id
       LEFT JOIN vehicles v
         ON v.id = r.vehicle_id
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT $1
       OFFSET $2`,
      [safePageSize, reviewsOffset]
    ),
    pool.query(`SELECT COUNT(*)::int AS total FROM contact_messages`),
    pool.query(
      `SELECT
        id,
        name,
        email,
        subject,
        created_at
       FROM contact_messages
       ORDER BY created_at DESC, id DESC
       LIMIT $1
       OFFSET $2`,
      [safePageSize, contactsOffset]
    ),
  ]);

  const usersTotal = usersTotalResult.rows[0]?.total || 0;
  const serviceTotal = serviceTotalResult.rows[0]?.total || 0;
  const reviewsTotal = reviewsTotalResult.rows[0]?.total || 0;
  const contactsTotal = contactsTotalResult.rows[0]?.total || 0;

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
    users: usersResult.rows,
    usersPagination: buildPagination({ total: usersTotal, page: safeUsersPage, pageSize: safePageSize }),
    serviceRequests: serviceResult.rows,
    servicePagination: buildPagination({ total: serviceTotal, page: safeServicePage, pageSize: safePageSize }),
    reviews: reviewsResult.rows,
    reviewsPagination: buildPagination({ total: reviewsTotal, page: safeReviewsPage, pageSize: safePageSize }),
    contactMessages: contactsResult.rows,
    contactsPagination: buildPagination({ total: contactsTotal, page: safeContactsPage, pageSize: safePageSize }),
  };
};
