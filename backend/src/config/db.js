const { Sequelize } = require('sequelize');
require('pg'); // Force Vercel to bundle the PostgreSQL driver
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;

let sequelize;

if (databaseUrl) {
  sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
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
    }
  );
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL database connection has been established successfully.');

    if (process.env.NODE_ENV === 'development') {
      // In dev: alter tables to reflect model changes
      await sequelize.sync({ alter: true });
      console.log('Database schemas synced (alter) successfully.');
    } else {
      // In production: only create tables if they don't exist — never drop data
      await sequelize.sync({ force: false, alter: false });
      console.log('Database schemas synced (safe) successfully.');
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error; // Let caller handle it (don't call process.exit here so Vercel serverless works)
  }
};

module.exports = {
  sequelize,
  connectDB
};
