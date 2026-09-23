const pool = require('../config/db');
const bcrypt = require('bcrypt');

async function createAdmin() {
  const email = 'admin@sentinelcore.com';
  const password = 'adminpassword';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  try {
    await pool.query('INSERT INTO usuarios (email, password_hash, rol) VALUES (?, ?, ?)', [email, hashedPassword, 'admin']);
    console.log('Admin user created');
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit();
}

createAdmin();
