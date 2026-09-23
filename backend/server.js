const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/db');
const objetivosRoutes = require('./routes/objetivos');
const puestosRoutes = require('./routes/puestos');
const turnosConfigRoutes = require('./routes/turnosConfig');
const vigiladoresRoutes = require('./routes/vigiladores');
const requerimientosRoutes = require('./routes/requerimientos');
const asignacionesRoutes = require('./routes/asignaciones');
const diagnosticoRoutes = require('./routes/diagnostico');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 18000;

app.use(cors());
app.use(express.json());

app.use('/api/objetivos', objetivosRoutes);
app.use('/api/puestos', puestosRoutes);
app.use('/api/turnos-config', turnosConfigRoutes);
app.use('/api/vigiladores', vigiladoresRoutes);
app.use('/api/requerimientos', requerimientosRoutes);
console.log('asignacionesRoutes:', asignacionesRoutes);
app.use('/api/asignaciones', asignacionesRoutes);
app.use('/api/diagnostico', diagnosticoRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'API SentinelCore funcionando' });
});

async function start() {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    console.log('  ✓ Conexión a MySQL establecida');
  } catch (err) {
    console.log('  ✗ No se pudo conectar a MySQL —', err.message);
    console.log('    Verificá las credenciales en el archivo .env');
  }

  app.listen(PORT, () => {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('  SENTINELCORE — Sistema de Gestión de Turnos');
    console.log('═══════════════════════════════════════════');
    console.log('  Estado:    ENCENDIDO');
    console.log(`  Puerto:    ${PORT}`);
    console.log(`  Servidor:  http://localhost:${PORT}`);
    console.log(`  API Base:  http://localhost:${PORT}/api`);
    console.log('═══════════════════════════════════════════');
    console.log('');
  });
}

start();
