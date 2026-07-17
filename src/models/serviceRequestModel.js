import { pool } from '../config/database.js';

export const getServiceRequestsByUserAndVehicle = async ({ userId, vehicleId }) => {
  const result = await pool.query(
    `SELECT
       id,
       user_id,
       vehicle_id,
       service_type,
       notes,
       status,
       created_at AS submitted_at,
       updated_at
     FROM service_requests
     WHERE user_id = $1
       AND vehicle_id = $2
     ORDER BY created_at DESC, id DESC`,
    [userId, vehicleId]
  );

  return result.rows;
};

export const getAllServiceRequests = async () => {
  const result = await pool.query(
    `SELECT
       sr.id,
       sr.user_id,
       u.name AS user_name,
       u.email AS user_email,
       sr.vehicle_id,
       CONCAT(v.year, ' ', v.make, ' ', v.model) AS vehicle_name,
       sr.service_type,
       sr.notes,
       sr.status,
       sr.created_at AS submitted_at,
       sr.updated_at,
       sr.employee_notes
     FROM service_requests sr
     INNER JOIN users u ON u.id = sr.user_id
     LEFT JOIN vehicles v ON v.id = sr.vehicle_id
     ORDER BY sr.created_at DESC, sr.id DESC`
  );

  return result.rows;
};

export const updateServiceRequestStatus = async ({ requestId, status, employeeNotes = null }) => {
  const normalizedStatus = ['Submitted', 'In Progress', 'Completed'].includes(status)
    ? status
    : 'Submitted';

  const result = await pool.query(
    `UPDATE service_requests
     SET status = $1,
         updated_at = CURRENT_TIMESTAMP,
         employee_notes = COALESCE($2, employee_notes)
     WHERE id = $3
     RETURNING id, status, updated_at`,
    [normalizedStatus, employeeNotes, requestId]
  );

  return result.rows[0] || null;
};

export const createServiceRequest = async ({ userId, vehicleId, serviceType, notes }) => {
  const normalizedNotes = notes || null;

  const result = await pool.query(
    `INSERT INTO service_requests (
       user_id,
       vehicle_id,
       service_type,
       notes,
       status
     )
     VALUES ($1, $2, $3, $4, 'Submitted')
     RETURNING id, user_id, vehicle_id, service_type, notes, status, created_at, updated_at`,
    [userId, vehicleId, serviceType, normalizedNotes]
  );

  return result.rows[0] || null;
};
