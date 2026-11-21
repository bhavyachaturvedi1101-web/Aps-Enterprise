'use strict';
/**
 * APS Enterprise Database Migration Runner
 * ──────────────────────────────────────────
 * Automatically tracks applied migrations in `_schema_migrations`.
 * Executes pending migrations sequentially within ACID transactions.
 */
const { sequelize } = require('../config/db');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_TABLE = '_schema_migrations';

async function initMigrationsTable(queryInterface, Sequelize) {
  await queryInterface.createTable(MIGRATIONS_TABLE, {
    id: {
      type: Sequelize.STRING(120),
      primaryKey: true,
      allowNull: false
    },
    name: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    executed_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  }).catch(() => {
    // Table may already exist; safe to ignore
  });
}

async function getExecutedMigrations() {
  try {
    const [results] = await sequelize.query(`SELECT id FROM ${MIGRATIONS_TABLE} ORDER BY id ASC`);
    return new Set(results.map(r => r.id));
  } catch (err) {
    return new Set();
  }
}

async function runMigrations() {
  console.log('[Migrations] Connecting to database...');
  try {
    await sequelize.authenticate();
    console.log('[Migrations] Database connected.');
  } catch (err) {
    console.warn(`[Migrations] Database connection offline (${err.message}). Skipping DB migrations for local mode.`);
    return { applied: 0, skipped: 0, offline: true };
  }

  const queryInterface = sequelize.getQueryInterface();
  const Sequelize = sequelize.constructor;

  await initMigrationsTable(queryInterface, Sequelize);
  const executed = await getExecutedMigrations();

  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => /^\d+_.+\.js$/.test(f))
    .sort();

  console.log(`[Migrations] Found ${files.length} migration file(s).`);

  let appliedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    const migrationId = path.basename(file, '.js');
    if (executed.has(migrationId)) {
      skippedCount++;
      continue;
    }

    console.log(`[Migrations] Executing migration: ${migrationId}...`);
    const migration = require(path.join(migrationsDir, file));

    const transaction = await sequelize.transaction();
    try {
      if (typeof migration.up === 'function') {
        await migration.up(queryInterface, Sequelize, transaction);
      }
      await queryInterface.bulkInsert(
        MIGRATIONS_TABLE,
        [{ id: migrationId, name: file, executed_at: new Date() }],
        { transaction }
      );
      await transaction.commit();
      console.log(`[Migrations] Applied: ${migrationId}`);
      appliedCount++;
    } catch (err) {
      await transaction.rollback();
      console.error(`[Migrations] Migration failed on ${migrationId}:`, err);
      throw err;
    }
  }

  console.log(`[Migrations] Complete. Applied: ${appliedCount}, Skipped: ${skippedCount}.`);
  return { applied: appliedCount, skipped: skippedCount, offline: false };
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migrations Error]', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
