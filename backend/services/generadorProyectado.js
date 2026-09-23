const pool = require('../config/db');

function combinarFechaHora(fecha, hora, sumarUnDia = false) {
  const dt = new Date(`${fecha}T${hora.slice(0, 5)}:00`);
  if (sumarUnDia) dt.setDate(dt.getDate() + 1);
  return dt;
}

function diffHoras(a, b) {
  return (a - b) / (1000 * 60 * 60);
}

function normalizarFecha(d) {
  if (typeof d === 'string') return d.slice(0, 10);
  return d;
}

function buildShift(item) {
  const cruzaMedianoche = item.hora_fin <= item.hora_inicio;
  return {
    ...item,
    fecha: normalizarFecha(item.fecha_asignacion || item.fecha),
    duracionHoras: Number(item.duracion_horas || 0),
    inicio: combinarFechaHora(
      item.fecha_asignacion || item.fecha,
      item.hora_inicio,
    ),
    fin: combinarFechaHora(
      item.fecha_asignacion || item.fecha,
      item.hora_fin,
      cruzaMedianoche,
    ),
    cruzaMedianoche,
  };
}

function contarFinesDeSemanaTrabajados(fechas) {
  let sabados = 0, domingos = 0;
  for (const f of fechas) {
    const fechaStr = typeof f === 'string' ? f : f.toISOString().slice(0,10);
    const dia = new Date(fechaStr).getDay();
    if (dia === 6) sabados++;
    if (dia === 0) domingos++;
  }
  return { sabados, domingos };
}

function validarEnMemoria({
  nuevoVigiladorId,
  nuevaFecha,
  turno,
  asignacionesExistentes,
  asignacionesPropuestas,
  horasAcumuladas,
  maxHorasMensuales,
}) {
  const conflictos = [];

  const todas = [
    ...asignacionesExistentes
      .filter((a) => a.id_vigilador === nuevoVigiladorId && a.estado !== 'cancelado'),
    ...asignacionesPropuestas
      .filter((a) => a.id_vigilador === nuevoVigiladorId),
  ].map(buildShift);

  const duracionNum = Number(turno.duracion_horas);
  const nuevoShift = buildShift({
    fecha_asignacion: nuevaFecha,
    hora_inicio: turno.hora_inicio,
    hora_fin: turno.hora_fin,
    duracion_horas: duracionNum,
  });

  // 1. Descanso 12hs entre turnos
  if (todas.length > 0) {
    const ordenadas = [...todas].sort((a, b) => a.inicio - b.inicio);

    const previa = ordenadas.filter((a) => a.fin <= nuevoShift.inicio).pop();
    if (previa) {
      const descanso = diffHoras(nuevoShift.inicio, previa.fin);
      if (descanso < 12) {
        conflictos.push(`Descanso < 12hs (${descanso.toFixed(1)}hs desde turno anterior)`);
      }
    }

    const siguiente = ordenadas.filter((a) => a.inicio >= nuevoShift.fin).shift();
    if (siguiente) {
      const descanso = diffHoras(siguiente.inicio, nuevoShift.fin);
      if (descanso < 12) {
        conflictos.push(`Descanso < 12hs (${descanso.toFixed(1)}hs hasta próximo turno)`);
      }
    }
  }

  // 2. Máx 6 días consecutivos
  const fechasUnicas = new Set(todas.map((a) => a.fecha));
  fechasUnicas.add(nuevaFecha);
  const fechasArray = Array.from(fechasUnicas).sort();

  const idxNueva = fechasArray.indexOf(nuevaFecha);
  let bloqueAtras = 0;
  for (let i = idxNueva - 1; i >= 0; i--) {
    const d1 = new Date(fechasArray[i]);
    const d2 = new Date(fechasArray[i + 1]);
    if ((d2 - d1) / (1000 * 60 * 60 * 24) === 1) bloqueAtras++;
    else break;
  }
  let bloqueAdelante = 0;
  for (let i = idxNueva + 1; i < fechasArray.length; i++) {
    const d1 = new Date(fechasArray[i]);
    const d2 = new Date(fechasArray[i - 1]);
    if ((d1 - d2) / (1000 * 60 * 60 * 24) === 1) bloqueAdelante++;
    else break;
  }
  const totalConsecutivos = 1 + bloqueAtras + bloqueAdelante;
  if (totalConsecutivos >= 7) {
    conflictos.push(`Máx 6 días consecutivos (serían ${totalConsecutivos})`);
  }

  // 3. Máx 12hs/día
  const mismoDia = todas.filter((a) => a.fecha === nuevaFecha);
  const horasMismoDia = mismoDia.reduce((sum, a) => sum + a.duracionHoras, 0);
  const totalHoras = horasMismoDia + duracionNum;
  if (totalHoras > 12) {
    conflictos.push(`Máx 12hs/día (${totalHoras.toFixed(1)}hs)`);
  }

  // 4. No solapamiento mismo día
  for (const existente of mismoDia) {
    if (nuevoShift.inicio < existente.fin && existente.inicio < nuevoShift.fin) {
      conflictos.push(`Solapamiento horario`);
    }
  }

// 5. Máx horas mensuales
  const horasProyectadas = (horasAcumuladas[nuevoVigiladorId] || 0) + duracionNum;
  const maxHorasNum = Number(maxHorasMensuales);
  if (horasProyectadas > maxHorasNum) {
    conflictos.push(`Supera max_horas_mensuales (${horasProyectadas.toFixed(2)}/${maxHorasNum})`);
  }

  // 6. Franco fin de semana: al menos 1 sábado O 1 domingo libre en el mes
  const finesTrabajados = contarFinesDeSemanaTrabajados([...todas.map(a => a.fecha), nuevaFecha]);
  const fechaObj = new Date(nuevaFecha);
  const anio = fechaObj.getFullYear();
  const mes = fechaObj.getMonth() + 1;
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const finesTotalesMes = { sabados: 0, domingos: 0 };
  for (let d = 1; d <= diasEnMes; d++) {
    const dia = new Date(anio, mes - 1, d).getDay();
    if (dia === 6) finesTotalesMes.sabados++;
    if (dia === 0) finesTotalesMes.domingos++;
  }
  const sabadosLibres = finesTotalesMes.sabados - finesTrabajados.sabados;
  const domingosLibres = finesTotalesMes.domingos - finesTrabajados.domingos;
  if (sabadosLibres === 0 && domingosLibres === 0) {
    conflictos.push(`Sin franco fin de semana (necesita 1 sáb O 1 dom libre/mes)`);
  }

  if (conflictos.length > 0) {
    console.log(`  [VALIDAR] Vig=${nuevoVigiladorId} Fecha=${nuevaFecha} -> ${conflictos.length} conflictos`);
    conflictos.forEach((c) => console.log(`    -> ${c}`));
  }
  return conflictos;
}

async function generar({ fechaInicio, fechaFin }) {
  console.log(`\n[MOTOR] Generando proyectado de ${fechaInicio} a ${fechaFin}`);
  const [reqRows] = await pool.query(
    `SELECT rm.id, rm.fecha, rm.id_puesto, rm.id_turno_config,
            tc.nombre AS turno_nombre, tc.hora_inicio, tc.hora_fin, tc.duracion_horas,
            p.nombre AS puesto_nombre, o.nombre AS objetivo_nombre
     FROM requerimientos_mensuales rm
     JOIN turnos_config tc ON tc.id = rm.id_turno_config
     JOIN puestos p ON p.id = rm.id_puesto
     JOIN objetivos o ON o.id = p.id_objetivo
     WHERE rm.fecha BETWEEN ? AND ?
     ORDER BY rm.fecha, tc.hora_inicio`,
    [fechaInicio, fechaFin]
  );

  if (reqRows.length === 0) {
    return { asignaciones_creadas: 0, puestos_descubiertos: 0, detalle: { asignaciones: [], puestos_sin_cubrir: [] } };
  }

  const [vigRows] = await pool.query(
    'SELECT id, nombre, legajo, max_horas_mensuales FROM vigiladores WHERE activo = 1'
  );

  if (vigRows.length === 0) {
    return {
      asignaciones_creadas: 0,
      puestos_descubiertos: reqRows.length,
      detalle: { asignaciones: [], puestos_sin_cubrir: reqRows.map((r) => ({
        id_requerimiento: r.id, fecha: r.fecha, puesto: `${r.objetivo_nombre} - ${r.puesto_nombre}`, turno: r.turno_nombre,
      })) },
    };
  }

  const bufferInicio = new Date(fechaInicio); bufferInicio.setDate(bufferInicio.getDate() - 7);
  const bufferFin = new Date(fechaFin); bufferFin.setDate(bufferFin.getDate() + 7);
  const bufferInicioStr = bufferInicio.toISOString().slice(0, 10);
  const bufferFinStr = bufferFin.toISOString().slice(0, 10);

  const [existentes] = await pool.query(
    `SELECT ac.id, ac.id_requerimiento, ac.id_vigilador, ac.fecha_asignacion, ac.estado,
            tc.hora_inicio, tc.hora_fin, tc.duracion_horas
     FROM asignaciones_cronograma ac
     JOIN requerimientos_mensuales rm ON rm.id = ac.id_requerimiento
     JOIN turnos_config tc ON tc.id = rm.id_turno_config
     WHERE ac.id_vigilador IN (?) AND ac.fecha_asignacion BETWEEN ? AND ?
       AND ac.estado IN ('pendiente', 'confirmado', 'propuesto')`,
    [vigRows.map((v) => v.id), bufferInicioStr, bufferFinStr]
  );

  const horasVigilador = {};
  const asignacionesExistentes = existentes.map((r) => ({ ...r, fecha_asignacion: normalizarFecha(r.fecha_asignacion) }));

  for (const vig of vigRows) {
    const hsPrevias = asignacionesExistentes
      .filter((a) => a.id_vigilador === vig.id)
      .reduce((sum, a) => sum + Number(a.duracion_horas || 0), 0);
    horasVigilador[vig.id] = hsPrevias;
  }

  const maxHorasMap = {};
  for (const vig of vigRows) maxHorasMap[vig.id] = vig.max_horas_mensuales;

  const idsReqAsignados = new Set(
    existentes
      .filter((a) => reqRows.some((r) => r.id === a.id_requerimiento))
      .map((a) => a.id_requerimiento)
  );

  const requerimientosPendientes = reqRows.filter((r) => !idsReqAsignados.has(r.id));

  const asignacionesPropuestas = [];
  const puestosSinCubrir = [];

  // FAIR SCHEDULING: para cada requerimiento, ordenar vigiladores por horas acumuladas (menos primero)
  for (const req of requerimientosPendientes) {
    const vigsOrdenados = [...vigRows].sort((a, b) => (horasVigilador[a.id] || 0) - (horasVigilador[b.id] || 0));
    let asignado = false;
    const motivos = [];

    for (const vig of vigsOrdenados) {
      const conflictos = validarEnMemoria({
        nuevoVigiladorId: vig.id,
        nuevaFecha: normalizarFecha(req.fecha),
        turno: req,
        asignacionesExistentes,
        asignacionesPropuestas,
        horasAcumuladas: horasVigilador,
        maxHorasMensuales: maxHorasMap[vig.id],
      });

      if (conflictos.length === 0) {
        const entrada = {
          id_requerimiento: req.id,
          id_vigilador: vig.id,
          fecha_asignacion: req.fecha,
          estado: 'propuesto',
        };
        asignacionesPropuestas.push({ ...entrada, hora_inicio: req.hora_inicio, hora_fin: req.hora_fin, duracion_horas: req.duracion_horas, id_vigilador: vig.id });
        horasVigilador[vig.id] += Number(req.duracion_horas);
        asignado = true;
        break;
      } else {
        motivos.push(`${vig.nombre}: ${conflictos.join('; ')}`);
      }
    }

    if (!asignado) {
      console.log('===== PUESTO DESCUBIERTO =====');
      console.log(`Req #${req.id} | ${req.fecha} | ${req.objetivo_nombre} - ${req.puesto_nombre} | ${req.turno_nombre} (${req.hora_inicio}-${req.hora_fin}) ${req.duracion_horas}hs`);
      vigRows.forEach((v) => console.log(`  - ${v.nombre} hs:${horasVigilador[v.id]}/${v.max_horas_mensuales}`));
      console.log('Motivos:', motivos.slice(0, 5));
      console.log('==============================');

      puestosSinCubrir.push({
        id_requerimiento: req.id, fecha: req.fecha, objetivo: req.objetivo_nombre,
        puesto: req.puesto_nombre, turno: req.turno_nombre, hora_inicio: req.hora_inicio, hora_fin: req.hora_fin,
        motivos_rechazo: motivos.slice(0, 5),
      });
    }
  }

  if (asignacionesPropuestas.length > 0) {
    const values = asignacionesPropuestas.map((a) => [a.id_requerimiento, a.id_vigilador, a.fecha_asignacion, a.estado]);
    const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
    await pool.query(`INSERT INTO asignaciones_cronograma (id_requerimiento, id_vigilador, fecha_asignacion, estado) VALUES ${placeholders}`, values.flat());
  }

  return {
    asignaciones_creadas: asignacionesPropuestas.length,
    puestos_descubiertos: puestosSinCubrir.length,
    detalle: { asignaciones: asignacionesPropuestas.map((a) => ({ id_requerimiento: a.id_requerimiento, id_vigilador: a.id_vigilador, fecha: a.fecha_asignacion, estado: a.estado })), puestos_sin_cubrir: puestosSinCubrir },
  };
}

module.exports = { generar };