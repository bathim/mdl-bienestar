require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Conexión robusta a PostgreSQL ──────────────────────────
// Usa DATABASE_URL si existe y NO apunta a localhost.
// Si no resuelve bien, arma la conexión con variables PG* individuales.
const url = process.env.DATABASE_URL || "";
const hasValidUrl = url && !url.includes("localhost") && !url.includes("127.0.0.1");

const pool = new Pool(
  hasValidUrl
    ? {
        connectionString: url,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT || 5432,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: { rejectUnauthorized: false },
      }
);

console.log("🔌 Método de conexión:", hasValidUrl ? "DATABASE_URL" : "variables PG*");
console.log("🔌 Host objetivo:", hasValidUrl ? "(definido en URL)" : (process.env.PGHOST || "❌ PGHOST no definido"));

// Crear tabla si no existe
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registros (
      id SERIAL PRIMARY KEY,
      fecha DATE UNIQUE NOT NULL,
      sueno FLOAT DEFAULT 7,
      digestion INT DEFAULT 3,
      ansiedad INT DEFAULT 3,
      alcohol_ml INT DEFAULT 0,
      agua_ml INT DEFAULT 2000,
      ejercicio BOOLEAN DEFAULT false,
      nopal BOOLEAN DEFAULT true,
      evento_social BOOLEAN DEFAULT false,
      notas TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("✅ Base de datos lista");
};

app.use(cors());
app.use(express.json());

// Servir React build en producción
app.use(express.static(path.join(__dirname, "client/build")));

// ── API ROUTES ──────────────────────────────────────────────

// Healthcheck simple
app.get("/api/health", (req, res) => res.json({ ok: true }));

// GET todos los registros
app.get("/api/records", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM registros ORDER BY fecha ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener registros" });
  }
});

// POST crear o actualizar registro (upsert por fecha)
app.post("/api/records", async (req, res) => {
  const {
    fecha, sueno, digestion, ansiedad,
    alcohol_ml, agua_ml, ejercicio, nopal,
    evento_social, notas
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO registros 
        (fecha, sueno, digestion, ansiedad, alcohol_ml, agua_ml, ejercicio, nopal, evento_social, notas, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
       ON CONFLICT (fecha) DO UPDATE SET
        sueno=$2, digestion=$3, ansiedad=$4, alcohol_ml=$5, agua_ml=$6,
        ejercicio=$7, nopal=$8, evento_social=$9, notas=$10, updated_at=NOW()
       RETURNING *`,
      [fecha, sueno, digestion, ansiedad, alcohol_ml, agua_ml, ejercicio, nopal, evento_social, notas]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar registro" });
  }
});

// DELETE registro por fecha
app.delete("/api/records/:fecha", async (req, res) => {
  try {
    await pool.query("DELETE FROM registros WHERE fecha = $1", [req.params.fecha]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar registro" });
  }
});

// Todas las demás rutas → React
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/build", "index.html"));
});

// ────────────────────────────────────────────────────────────

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🌵 MDL Bienestar corriendo en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Error al inicializar la base de datos:", err.message);
    // Arranca el servidor de todas formas para no quedar en crash-loop
    app.listen(PORT, () => {
      console.log(`⚠️ Servidor arriba en puerto ${PORT} SIN base de datos`);
    });
  });
