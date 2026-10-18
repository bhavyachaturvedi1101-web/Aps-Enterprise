const { Sequelize } = require('sequelize');
require('pg'); // Force Vercel to bundle the PostgreSQL driver
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

const poolConfig = {
  max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
  min: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN, 10) : 2,
  acquire: process.env.DB_POOL_ACQUIRE ? parseInt(process.env.DB_POOL_ACQUIRE, 10) : 30000,
  idle: 10000,
  evict: 5000
};

let sequelize;

if (databaseUrl) {
  const useSSL = process.env.DATABASE_SSL !== 'false' && !databaseUrl.includes('sslmode=disable');
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: poolConfig,
    dialectOptions: useSSL ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'aps_enterprise',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: poolConfig
    }
  );
}

let isConnected = false;

const isDbConnected = () => isConnected;

/**
 * Resilient database connection with exponential backoff retry
 */
const connectDB = async (maxRetries = 3, initialDelayMs = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sequelize.authenticate();
      isConnected = true;
      console.log('PostgreSQL database connection has been established successfully.');

      if (process.env.NODE_ENV === 'development') {
        // In dev: safely alter tables to reflect model schema updates
        await sequelize.sync({ alter: true });
        console.log('Database schemas synced (alter) successfully.');
      } else {
        // In production: only create missing tables — never drop data
        await sequelize.sync({ force: false, alter: false });
        console.log('Database schemas synced (safe) successfully.');
      }
      return true;
    } catch (error) {
      isConnected = false;
      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt - 1);
        console.warn(`[DB Connect Warning] Attempt ${attempt}/${maxRetries} failed (${error.message}). Retrying in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.error(`[DB Connect Critical] All ${maxRetries} connection attempts failed:`, error.message || error);
        throw error;
      }
    }
  }
};

module.exports = {
  sequelize,
  connectDB,
  isDbConnected
};

