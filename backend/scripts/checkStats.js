require('dotenv').config();
const mysql = require('mysql2/promise');
async function stats() {
  const conn = await mysql.createConnection({host:process.env.DB_HOST,port:process.env.DB_PORT,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  const [rows] = await conn.query(`
    SELECT v.nombre, v.max_horas_mensuales,
           COUNT(*) as turnos,
           SUM(CAST(tc.duracion_horas AS DECIMAL(10,2))) as horas_totales,
           GROUP_CONCAT(DISTINCT DATE(ac.fecha_asignacion) ORDER BY DATE(ac.fecha_asignacion)) as fechas
    FROM asignaciones_cronograma ac
    JOIN requerimientos_mensuales rm ON rm.id = ac.id_requerimiento
    JOIN turnos_config tc ON tc.id = rm.id_turno_config
    JOIN vigiladores v ON v.id = ac.id_vigilador
    WHERE ac.fecha_asignacion BETWEEN '2026-09-01' AND '2026-09-30'
      AND ac.estado IN ('pendiente','confirmado','propuesto')
    GROUP BY v.id
    ORDER BY horas_totales
  `);
  rows.forEach(r => {
    const fechas = r.fechas.split(',').map(f => new Date(f).getDay());
    const sab = fechas.filter(d => d===6).length;
    const dom = fechas.filter(d => d===0).length;
    console.log(r.nombre.padEnd(25) + ' | ' + r.horas_totales.toString().padStart(6) + 'hs | ' + r.turnos.toString().padStart(3) + ' turnos | Sab:' + sab + ' Dom:' + dom + ' | Libre finde: ' + (sab<5 || dom<5 ? 'SI' : 'NO'));
  });
  await conn.end();
}
stats();