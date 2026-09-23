const { Router } = require('express');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../config/db');
const { generarToken } = require('../middleware/auth');

const router = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ error: 'Credential de Google requerido' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let [rows] = await pool.query('SELECT * FROM usuarios WHERE google_id = ?', [googleId]);

    let usuario;
    if (rows.length === 0) {
      [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
      if (rows.length > 0) {
        usuario = rows[0];
        await pool.query('UPDATE usuarios SET google_id = ?, ultimo_login = NOW() WHERE id = ?', [googleId, usuario.id]);
      } else {
        const [result] = await pool.query(
          'INSERT INTO usuarios (email, nombre, google_id, rol, activo) VALUES (?, ?, ?, ?, ?)',
          [email, name, googleId, 'admin', true]
        );
        usuario = { id: result.insertId, email, nombre: name, rol: 'admin', activo: true };
      }
    } else {
      usuario = rows[0];
      await pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [usuario.id]);
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Usuario desactivado' });
    }

    const token = generarToken(usuario);
    res.json({
      token,
      usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol }
    });
  } catch (err) {
    console.error('Error en Google Auth:', err);
    res.status(401).json({ error: 'Token de Google inválido' });
  }
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query('SELECT id, email, nombre, rol FROM usuarios WHERE id = ? AND activo = 1', [decoded.id]);
    if (rows.length === 0) return res.status(401).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;