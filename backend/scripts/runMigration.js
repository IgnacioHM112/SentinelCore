const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
  const sqlFile = path.join(__dirname, '..', 'migrations', '001_fundacion.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'brujula_db',
    multipleStatements: true
  });

  try {
    console.log('Ejecutando migración 001_fundacion.sql...');
    await connection.query(sql);
    console.log('✓ Migración completada exitosamente');
  } catch (err) {
    console.error('✗ Error en migración:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigration();