import express from "express";
import dns from "dns";
import { pool } from "./db.js";
import { buildSkeleton } from "./skeletonize.js";

dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "BigBio API running" });
});

app.get("/health/env", (_req, res) => {
  const hasDatabaseUrl = typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0;
  res.json({
    hasDatabaseUrl,
    databaseUrlLength: process.env.DATABASE_URL?.length ?? 0,
    nodeVersion: process.version
  });
});

app.get("/health/db", async (_req, res) => {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ db: "error", message: "DATABASE_URL not set" });
    }
    const client = await pool.connect();
    const ip = (client as any)?.connection?.stream?.remoteAddress ?? null;
    const result = await client.query("select 1 as ok");
    client.release();
    return res.json({ db: "ok", result: result.rows[0], connectedTo: ip });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ db: "error", message: err?.message ?? "unknown" });
  }
});

/**
 * INTERNAL (v1): Admin duplicate preview for a given blockId.
 * - Computes skeleton from current block.content
 * - Ensures block_templates row exists (upsert)
 * - Finds exact signature match among existing library templates
 * - Finds fuzzy matches among existing library templates using trigram similarity
 */
app.get("/admin/library/dupes", async (req, res) => {
  const blockId = String(req.query.blockId || "").trim();
  if (!blockId) return res.status(400).json({ error: "blockId is required" });

  const client = await pool.connect();
  try {
    const block = await client.query(
      "select id, content from blocks where id = $1 limit 1",
      [blockId]
    );
    if (block.rowCount === 0) return res.status(404).json({ error: "block not found" });

    const { skeletonText, skeletonSig, slotCount, lineCount } = buildSkeleton(block.rows[0].content);

    await client.query(
      `insert into block_templates (block_id, skeleton_text, skeleton_sig, slot_count, line_count, status, updated_at)
       values ($1, $2, $3, $4, $5, 'heuristic', now())
       on conflict (block_id) do update set
         skeleton_text = excluded.skeleton_text,
         skeleton_sig  = excluded.skeleton_sig,
         slot_count    = excluded.slot_count,
         line_count    = excluded.line_count,
         status        = 'heuristic',
         updated_at    = now()`,
      [blockId, skeletonText, skeletonSig, slotCount, lineCount]
    );

    // Exact duplicates among existing library templates
    const exact = await client.query(
      `
      select
        li.id as library_item_id,
        li.title as library_title,
        li.template_block_id,
        bt.skeleton_sig
      from library_items li
      join block_templates bt on bt.block_id = li.template_block_id
      where bt.skeleton_sig = $1
      limit 10
      `,
      [skeletonSig]
    );

    // Fuzzy duplicates among existing library templates (trigram similarity)
    // Uses pg_trgm + gin_trgm_ops index you added.
    const fuzzy = await client.query(
      `
      select
        li.id as library_item_id,
        li.title as library_title,
        li.template_block_id,
        similarity(bt.skeleton_text, $1) as score
      from library_items li
      join block_templates bt on bt.block_id = li.template_block_id
      where bt.skeleton_text % $1
      order by score desc
      limit 10
      `,
      [skeletonText]
    );

    return res.json({
      blockId,
      skeletonSig,
      slotCount,
      lineCount,
      exact: exact.rows,
      fuzzy: fuzzy.rows
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

/**
 * INTERNAL (v1): Promote a block into the library (admin-only later).
 * Body:
 * {
 *   "blockId": "...uuid...",
 *   "categoryId": 123,
 *   "title": "TOP FRIENDS",
 *   "description": "Remix to show your list"
 * }
 */
app.post("/admin/library/promote", async (req, res) => {
  const blockId = String(req.body?.blockId || "").trim();
  const categoryId = Number(req.body?.categoryId);
  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();

  if (!blockId) return res.status(400).json({ error: "blockId is required" });
  if (!Number.isFinite(categoryId)) return res.status(400).json({ error: "categoryId must be a number" });
  if (!title) return res.status(400).json({ error: "title is required" });

  const client = await pool.connect();
  try {
    await client.query("begin");

    const block = await client.query(
      "select id, content from blocks where id = $1 limit 1",
      [blockId]
    );
    if (block.rowCount === 0) {
      await client.query("rollback");
      return res.status(404).json({ error: "block not found" });
    }

    const { skeletonText, skeletonSig, slotCount, lineCount } = buildSkeleton(block.rows[0].content);

    // Upsert template record for source block
    await client.query(
      `insert into block_templates (block_id, skeleton_text, skeleton_sig, slot_count, line_count, status, updated_at)
       values ($1, $2, $3, $4, $5, 'heuristic', now())
       on conflict (block_id) do update set
         skeleton_text = excluded.skeleton_text,
         skeleton_sig  = excluded.skeleton_sig,
         slot_count    = excluded.slot_count,
         line_count    = excluded.line_count,
         status        = 'heuristic',
         updated_at    = now()`,
      [blockId, skeletonText, skeletonSig, slotCount, lineCount]
    );

    // Exact dup check against existing library templates
    const exact = await client.query(
      `
      select
        li.id as library_item_id,
        li.template_block_id
      from library_items li
      join block_templates bt on bt.block_id = li.template_block_id
      where bt.skeleton_sig = $1
      limit 1
      `,
      [skeletonSig]
    );

    if (exact.rowCount > 0) {
      const dup = exact.rows[0];

      await client.query(
        `insert into library_promotion_events
          (source_block_id, requested_category_id, outcome, duplicate_of_library_item_id, skeleton_sig, best_match_score, best_match_template_block_id, best_match_library_item_id)
         values
          ($1, $2, 'duplicate', $3, $4, 1.0, $5, $3)`,
        [blockId, categoryId, dup.library_item_id, skeletonSig, dup.template_block_id]
      );

      await client.query("commit");
      return res.json({
        outcome: "duplicate",
        duplicateOfLibraryItemId: dup.library_item_id
      });
    }

    // Fuzzy check (pick best match)
    const fuzzy = await client.query(
      `
      select
        li.id as library_item_id,
        li.template_block_id,
        similarity(bt.skeleton_text, $1) as score
      from library_items li
      join block_templates bt on bt.block_id = li.template_block_id
      where bt.skeleton_text % $1
      order by score desc
      limit 1
      `,
      [skeletonText]
    );

    const best = fuzzy.rowCount > 0 ? fuzzy.rows[0] : null;
    const bestScore = best ? Number(best.score) : 0;

    // v1 policy: since you said "fuzzy", we treat high similarity as duplicate.
    // Tune threshold anytime.
    const FUZZY_DUP_THRESHOLD = 0.75;

    if (best && bestScore >= FUZZY_DUP_THRESHOLD) {
      await client.query(
        `insert into library_promotion_events
          (source_block_id, requested_category_id, outcome, duplicate_of_library_item_id, skeleton_sig, best_match_score, best_match_template_block_id, best_match_library_item_id, note)
         values
          ($1, $2, 'duplicate', $3, $4, $5, $6, $3, 'fuzzy-dup-threshold')`,
        [blockId, categoryId, best.library_item_id, skeletonSig, bestScore, best.template_block_id]
      );

      await client.query("commit");
      return res.json({
        outcome: "duplicate",
        duplicateOfLibraryItemId: best.library_item_id,
        score: bestScore
      });
    }

    // Not a duplicate: promote to library
    const created = await client.query(
      `
      insert into library_items (category_id, template_block_id, title, description, is_featured, is_active)
      values ($1, $2, $3, $4, false, true)
      returning id
      `,
      [categoryId, blockId, title, description || null]
    );

    const libraryItemId = created.rows[0].id;

    await client.query(
      `insert into library_promotion_events
        (source_block_id, requested_category_id, outcome, created_library_item_id, skeleton_sig, best_match_score, best_match_template_block_id, best_match_library_item_id)
       values
        ($1, $2, 'promoted', $3, $4, $5, $6, $7)`,
      [blockId, categoryId, libraryItemId, skeletonSig, bestScore || null, best?.template_block_id ?? null, best?.library_item_id ?? null]
    );

    await client.query("commit");
    return res.json({
      outcome: "promoted",
      libraryItemId
    });
  } catch (err: any) {
    console.error(err);
    try { await client.query("rollback"); } catch {}
    return res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => {
  console.log(`BigBio API running on port ${PORT}`);
});
