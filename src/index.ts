import express from "express";
import pg from "pg";
import dns from "node:dns/promises";

const { Pool } = pg;

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "BigBio API running" });
});

app.get("/health/env", (_req, res) => {
  const hasDatabaseUrl =
    typeof process.env.DATABASE_URL === "string" &&
    process.env.DATABASE_URL.length > 0;

  res.json({
    hasDatabaseUrl,
    databaseUrlLength: process.env.DATABASE_URL?.length ?? 0,
    nodeVersion: process.version,
  });
});

app.get("/health/db", async (_req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        db: "error",
        message: "DATABASE_URL not set",
      });
    }

    const url = new URL(process.env.DATABASE_URL);
    const host = url.hostname;

    // Force IPv4
    const ipv4 = await dns.lookup(host, { family: 4 });

    const pool = new Pool({
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace("/", "") || "postgres",
      port: Number(url.port || 5432),

      // connect directly to IPv4
      host: ipv4.address,

      // keep TLS happy
      ssl: {
        rejectUnauthorized: false,
        servername: host,
      },
    });

    const result = await pool.query("select 1 as ok");
    await pool.end();

    res.json({
      db: "ok",
      result: result.rows[0],
      connectedTo: ipv4.address,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      db: "error",
      message: String(err?.message ?? err),
    });
  }
});

app.listen(PORT, () => {
  console.log(`BigBio API running on port ${PORT}`);
});
