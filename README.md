# SentinelCore Management System 🛡️

Sistema web para gestionar servicios de vigilancia de empresas de seguridad. Reemplaza el Excel manual que es difícil de ver en celular, no muestra quién está disponible rápido, y genera errores en francos y descansos. Arranca con **Chango Más** como piloto, pero está armado desde el día uno para sumar todos los objetivos sin rehacer nada.

## 👥 Roles

| Rol | Permisos |
|-----|----------|
| **Admin** | Único que alimenta el sistema: crea objetivos, configura puestos/turnos, carga vigiladores con restricciones, carga requerimientos que mandan los AP por WhatsApp/mail |
| **Encargado** | Opera día a día: registra novedades y confirma presentismo |

---

## ⚙️ Motor de Asignación (Corazón del sistema)

El AP de cada objetivo dice qué horas y puestos necesita cubrir. El admin carga ese requerimiento. El sistema, con la info de vigiladores y restricciones, **propone automáticamente quién cubre cada cosa** respetando reglas laborales:

- ✅ 8hs estándar, hasta 12hs con recargo
- ✅ 12hs descanso mínimo entre turnos
- ✅ Máx 6 días consecutivos trabajados
- ✅ Al menos 1 franco en fin de semana por mes (sábado **O** domingo libre)
- ✅ Turno nocturno: 21:00–06:00 (se contabiliza aparte)
- ✅ Máx horas mensuales por vigilador (configurable)

El admin puede **modificar la propuesta a mano**. Si rompe alguna regla, el sistema avisa con mensaje claro pero **no bloquea** — la decisión final siempre es del admin. Clave porque los requerimientos cambian seguido y a veces con poca anticipación.

### Funciones adicionales del motor
- **Reemplazo automático**: cuando falta un vigilador (vacaciones, enfermo, aviso, suspensión, franco), sugiere quién puede reemplazarlo cumpliendo reglas
- **Distribución equitativa**: algoritmo "fair scheduling" prioriza vigiladores con menos horas acumuladas → todos terminan con cargas similares (ej: 68–76hs vs 44–96hs anterior)

---

## 📋 Presentismo Diario (reemplaza Google Form)

Al día siguiente de cada jornada se genera reporte con:
- Horario real vs programado
- Horas trabajadas
- Novedades (tardanza, salida temprana, falta, franco, etc.)
- Visita de jefe/encargado al puesto

El encargado confirma **en bulk** (un click "todos asistieron") y edita solo excepciones. Si hubo tardanza → se suman horas extra al vigilador anterior + se crea deuda de recuperación para el que llegó tarde.

---

## 📊 Reportes Mensuales

- Por objetivo: horas normales, extras, nocturnas, francos, ausencias
- Comparativo entre objetivos (útil para facturación)
- Export PDF / Excel

---

## 🕵️ Auditoría

Todo cambio queda en historial con: quién, cuándo, qué modificó.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Backend** | Node.js, Express, MySQL (mysql2), JWT, Google OAuth2 |
| **Frontend** | React 18, Vite, TailwindCSS, React Router, XLSX (export), @react-oauth/google |
| **Auth** | Google Sign-In (SSO empresarial) + JWT propio |
| **Dev** | Nodemon, ESLint, Jest (tests motor) |

---

## 🗄️ Esquema BD (tablas clave)

| Tabla | Propósito |
|-------|-----------|
| `objetivos` | Clientes (ej: Chango Más) |
| `puestos` | Puestos por objetivo (Entrada, Playa, Cajas) |
| `turnos_config` | Turnos por objetivo (Mañana 07-11, Tarde 13-21, etc.) + `es_nocturno` |
| `vigiladores` | Legajo, max_horas_mensuales, `id_objetivo_preferido`, `google_id` |
| `requerimientos_mensuales` | Qué puesto/turno necesita cada día del mes |
| `asignaciones_cronograma` | Resultado del motor: vigilador ↔ requerimiento + estado |
| `novedades` | Vacaciones, enfermedad, aviso, suspensión, franco, tardanza (con `horas_a_recuperar`) |
| `presentismo` | Horas reales, asistencia, novedad, visita jefe, confirmación |
| `auditoria` | Log de toda escritura (user, acción, entidad, antes/después) |
| `usuarios` | Auth propio + Google (`google_id`, `rol`: admin/encargado) |

---

## 🚀 Puesta en marcha

### 1. Variables de entorno

**Backend** (`backend/.env`):
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=brujula_db
PORT=18000

GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
JWT_SECRET=clave-larga-aleatoria
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:18000/api
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

### 2. Google Cloud Console
- Crear proyecto → **APIs y servicios → Credenciales → ID de cliente OAuth 2.0 (Web)**
- Orígenes autorizados: `http://localhost:5173`
- URI redirección: `http://localhost:5173/auth/callback`

### 3. Base de datos
```bash
cd backend
node scripts/runMigration.js   # ejecuta migrations/001_fundacion.sql
```

### 4. Levantar servidores
```bash
# Terminal 1 - Backend
cd backend && npm run dev      # http://localhost:18000

# Terminal 2 - Frontend
cd frontend && npm run dev     # http://localhost:5173
```

---

## 📡 Endpoints principales

| Módulo | Endpoints |
|--------|-----------|
| **Auth** | `POST /api/auth/google` (login), `GET /api/auth/me` |
| **Objetivos** | `GET/POST /api/objetivos`, `GET/PUT/DELETE /api/objetivos/:id` |
| **Puestos** | `GET/POST /api/puestos`, `GET /api/puestos/por-objetivo/:id` |
| **Turnos** | `GET/POST /api/turnos-config`, `GET /api/turnos-config/por-objetivo/:id` |
| **Vigiladores** | `GET/POST /api/vigiladores`, `GET/PUT/DELETE /api/vigiladores/:id` |
| **Requerimientos** | `GET/POST /api/requerimientos`, `POST /api/requerimientos/generar-mensual` |
| **Asignaciones** | `GET/POST /api/asignaciones`, `POST /api/asignaciones/generar-proyectado`, `POST /api/asignaciones/validar` |
| **Novedades** | `GET/POST/PUT/DELETE /api/novedades` *(Fase 2)* |
| **Presentismo** | `GET/POST /api/presentismo`, `POST /api/presentismo/confirmar-dia` *(Fase 3)* |
| **Reportes** | `GET /api/reportes/mensual/:objetivoId/:anio/:mes`, `GET /api/reportes/comparativo/:anio/:mes` *(Fase 4)* |
| **Reemplazo** | `POST /api/asignaciones/sugerir-reemplazo` *(Fase 5)* |

---

## 🧪 Tests

```bash
cd backend && npm test
# Cubre: validarEnMemoria, generar (franco finde, nocturno, consecutivos, solape, horas día/mes)
```

---

## 📦 Estado del proyecto (Sept 2026)

| Fase | Estado | Detalle |
|------|--------|---------|
| **0. Fundación** | ✅ | Migraciones, Auth Google+JWT, Frontend protegido, Logo |
| **1. Motor asignación** | ✅ | Fair scheduling, franco finde, nocturno 21-06, preferencia objetivo, distribución equitativa |
| **2. Novedades** | 🔄 Próxima | CRUD + integración motor (excluir vigiladores con novedad) |
| **3. Presentismo** | ⏳ | Pantalla bulk + lógica tardanza→deuda + dashboard deudas |
| **4. Reportes** | ⏳ | PDF/Excel mensual + comparativo |
| **5. Reemplazo auto** | ⏳ | `sugerir-reemplazo` por horas/conflictos |
| **6. Auditoría + Dashboard** | ⏳ | Middleware + KPIs |

---

## 📝 Licencia

Uso interno - Empresa de seguridad privada.