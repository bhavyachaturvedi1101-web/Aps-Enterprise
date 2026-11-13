const { Sequelize } = require('sequelize');
require('pg'); // Force Vercel to bundle the PostgreSQL driver
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

const poolConfig = {
  max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 5,
  min: 0,
  acquire: 30000,
  idle: 10000
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

const connectDB = async (retryCount = 1) => {
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

    // Synchronize the single production admin account using a bcrypt hash.
    const adminEmail = (process.env.ADMIN_EMAIL || process.env.TELEFORCE_CRM_LOGIN_EMAIL || '').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    if (adminEmail && adminPassword) {
      const bcrypt = require('bcryptjs');
      const { User } = require('../models');
      await User.upsert({
        id: 'USR-001',
        name: 'Super Admin',
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: 'admin',
        title: 'Chief System & Operations Admin',
        department: 'Executive & AI Management',
        avatar: 'A',
        avatarBg: '#09090b',
        isActive: true
      });
      console.log('[DB] Primary admin account synchronized.');
    }
  } catch (error) {
    if (retryCount > 0) {
      console.warn(`[DB Connect Warning] First attempt failed (${error.message}). Retrying in 1s...`);
      await new Promise(r => setTimeout(r, 1000));
      return connectDB(retryCount - 1);
    }
    isConnected = false;
    console.error('Unable to connect to the database:', error.message || error);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectDB,
  isDbConnected
};

