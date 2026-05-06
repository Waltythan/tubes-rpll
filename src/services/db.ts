import { Pool } from 'pg';

type DbConfig = {
  host?: string;
  port?: number | string;
  database?: string;
  username?: string;
  password?: string;
};

const getLocalConfig = (): DbConfig | null => {
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  try {
    // Keep dev/test aligned with the repository's shared database config.
    // This avoids falling back to placeholder credentials when .env is absent.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require('../../config/config.json');
    const envName = process.env.NODE_ENV === 'test' ? 'test' : 'development';
    return config[envName] || config.development || null;
  } catch {
    return null;
  }
};

const localConfig = getLocalConfig();

// Construct connection string from environment variables
const getConnectionString = () => {
  // If DATABASE_URL is provided, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Otherwise, construct from individual variables
  const host = process.env.DB_HOST || localConfig?.host || 'localhost';
  const port = process.env.DB_PORT || localConfig?.port || '5432';
  const database = process.env.DB_NAME || localConfig?.database || 'mini_hris';
  const user = process.env.DB_USER || localConfig?.username || 'postgres';
  const password = process.env.DB_PASSWORD || localConfig?.password || 'password';

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

const connectionString = getConnectionString();

const pool = new Pool({ connectionString });

export default pool;
