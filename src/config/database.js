import { Pool } from 'pg';

const poolConfig = {
  ssl: { rejectUnauthorized: false },
};

export const pool = new Pool(poolConfig);