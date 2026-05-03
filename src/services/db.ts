import { Pool } from 'pg';

// Construct connection string from environment variables
const getConnectionString = () => {
  // If DATABASE_URL is provided, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Otherwise, construct from individual variables
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME || 'mini_hris';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || 'password';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

const connectionString = getConnectionString();

const pool = new Pool({ connectionString });

export default pool;
