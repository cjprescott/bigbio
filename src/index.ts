import express from "express";
import pg from "pg";

const { Pool } = pg;

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "BigBio API running" });
});

app.get("/health/db", async (_req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ db: "error", message: "DATABASE_URL not set" });
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Supabase requires SSL
    });

    const result = await pool.query("select 1 as ok");
    await pool.end();

    return res.json({ db: "ok", result: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ db: "error" });
  }
});

app.listen(PORT, () => {
  console.log(`BigBio API running on port ${PORT}`);
});
