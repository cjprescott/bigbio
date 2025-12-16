import express from "express";
import dns from "dns";
import { pool } from "./db.js";
import { buildSkeleton } from "./skeletonize.js";
import { suggestTagsFromContent } from "./tagSuggest.js";

dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const FUZZY_DUP_THRESHOLD = 0.75;

app.use(express.json());

app.get("/", (_req, res) => res.json({ status: "BigBio API running" }));

app.get("/health/env", (_req, res) => {
  const hasDatabaseUrl = typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.length > 0;
  res.json({ hasDatabaseUrl, databaseUrlLength: process.env.DATABASE_URL?.length ?? 0, nodeVersion: process.version });
});

app.get("/health/db", async (_req, res) => {
  try {
    if (!process.env.DATABASE_URL) return res.status(500).json({ db: "error", message: "DATABASE_URL not set" });
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
 * Admin: show duplicate candidates + suggested tags
 */
app.get("/admin/library/dupes", async (req, res) => {
  const blockId = String(req.query.blockId || "").trim();
  if (!blockId) return res.status(400).json({ error: "blockId is required" });

  const client = await pool.connect();
  try {
    const block = await client.query("select id, content from blocks where id = $1 limit 1", [blockId]);
    if (block.rowCount === 0) return res.status(404).json({ error: "block not found" });

    const content = block.rows[0].content as string;
    const sk = buildSkeleton(content);
    const suggestedTags = suggestTagsFromContent(sk.skeletonText + "\n" + content);

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
      [blockId, sk.skeletonText, sk.skeletonSig, sk.slotCount, sk.lineCount]
    );

    const exact = await client.query(
      `
      select
        li.id as library_item_id,
        li.title as library_title,
        li.template_block_id
      from library_items li
      join block_templates bt on bt.block_id = li.template_block_id
      where bt.skeleton_sig = $1
      limit 10
      `,
      [sk.skeletonSig]
    );

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
      [sk.skeletonText]
    );

    return res.json({
      blockId,
      skeletonSig: sk.skeletonSig,
      slotCount: sk.slotCount,
      lineCount: sk.lineCount,
      suggestedTags,
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
 * Admin: compare source block with a library template side-by-side (for override judgment)
 * GET /admin/library/compare?blockId=...&libraryItemId=...
 */
app.get("/admin/library/compare", async (req, res) => {
  const blockId = String(req.query.blockId || "").trim();
  const libraryItemId = String(req.query.libraryItemId || "").trim();
  if (!blockId || !libraryItemId) return res.status(400).json({ error: "blockId and libraryItemId are required" });

  const client = await pool.connect();
  try {
    const src = await client.query("select id, title, content from blocks where id = $1 limit 1", [blockId]);
    if (src.rowCount === 0) return res.status(404).json({ error: "source block not found" });

    const li = await client.query("select id, title, template_block_id from library_items where id = $1 limit 1", [libraryItemId]);
    if (li.rowCount === 0) return res.status(404).json({ error: "library item not found" });

    const tplId = li.rows[0].template_block_id;
    const tpl = await client.query("select id, title, content from blocks where id = $1 limit 1", [tplId]);

    const srcSk = buildSkeleton(src.rows[0].content);
    const tplSk = buildSkeleton(tpl.rows[0].content);

    return res.json({
      source: { id: src.rows[0].id, title: src.rows[0].title, content: src.rows[0].content, skeleton: srcSk.skeletonText, sig: srcSk.skeletonSig },
      template: { libraryItemId: li.rows[0].id, libraryTitle: li.rows[0].title, blockId: tplId, title: tpl.rows[0].title, content: tpl.rows[0].content, skeleton: tplSk.skeletonText, sig: tplSk.skeletonSig }
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

/**
 * Admin: promote to library (requires tagsConfirmed)
 * Body:
 * {
 *   blockId, categoryId, title, description,
 *   tagsConfirmed: ["friends","lists"],
 *   forcePromote: true|false
 * }
 */
app.post("/admin/library/promote", async (req, res) => {
  const blockId = String(req.body?.blockId || "").trim();
  const categoryId = Number(req.body?.categoryId);
  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();
  const tagsConfirmed = Array.isArray(req.body?.tagsConfirmed) ? req.body.tagsConfirmed.map((t: any) => String(t).trim()).filter(Boolean) : [];
  const forcePromote = Boolean(req.body?.forcePromote);

  if (!blockId) return res.status(400).json({ error: "blockId is required" });
  if (!Number.isFinite(categoryId)) return res.status(400).json({ error: "categoryId must be a number" });
  if (!title) return res.status(400).json({ error: "title is required" });
  if (tagsConfirmed.length === 0) return res.status(400).json({ error: "tagsConfirmed is required (non-empty array)" });

  const client = await pool.connect();
  try {
    await client.query("begin");

    const block = await client.query("select id, content from blocks where id = $1 limit 1", [blockId]);
    if (block.rowCount === 0) {
      await client.query("rollback");
      return res.status(404).json({ error: "block not found" });
    }

    const content = block.rows[0].content as string;
    const sk = buildSkeleton(content);
    const suggestedTags = suggestTagsFromContent(sk.skeletonText + "\n" + content);

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
      [blockId, sk.skeletonText, sk.skeletonSig, sk.slotCount, sk.lineCount]
    );

    // Exact dup
    const exact = await client.query(
      `
      select li.id as library_item_id, li.template_block_id
      from library_items li
      join block_templates bt on bt.block_id = li.template_block_id
      where bt.skeleton_sig = $1
      limit 1
      `,
      [sk.skeletonSig]
    );

    // Best fuzzy
    const fuzzy = await client.query(
      `
      select li.id as library_item_id, li.template_block_id, similarity(bt.skeleton_text, $1) as score
      from library_items li
      join block_templates bt on bt.block_id = li.template_block_id
      where bt.skeleton_text % $1
      order by score desc
      limit 1
      `,
      [sk.skeletonText]
    );

    const best = fuzzy.rowCount > 0 ? fuzzy.rows[0] : null;
    const bestScore = best ? Number(best.score) : 0;

    const dupLibraryItemId = exact.rowCount > 0 ? exact.rows[0].library_item_id : (bestScore >= FUZZY_DUP_THRESHOLD ? best?.library_item_id : null);
    const dupTemplateBlockId = exact.rowCount > 0 ? exact.rows[0].template_block_id : (bestScore >= FUZZY_DUP_THRESHOLD ? best?.template_block_id : null);

    // Duplicate and no override => stop
    if (dupLibraryItemId && !forcePromote) {
      await client.query(
        `insert into library_promotion_events
          (source_block_id, requested_category_id, outcome, duplicate_of_library_item_id, skeleton_sig, best_match_score, best_match_template_block_id, best_match_library_item_id, note)
         values
          ($1, $2, 'duplicate', $3, $4, $5, $6, $3, 'blocked-no-override')`,
        [blockId, categoryId, dupLibraryItemId, sk.skeletonSig, bestScore || 1.0, dupTemplateBlockId]
      );
      await client.query("commit");
      return res.json({
        outcome: "duplicate",
        duplicateOfLibraryItemId: dupLibraryItemId,
        bestMatchScore: bestScore || 1.0,
        suggestedTags
      });
    }

    // Promote (either unique OR override)
    const created = await client.query(
      `
      insert into library_items (category_id, template_block_id, title, description, is_featured, is_active, tags_text)
      values ($1, $2, $3, $4, false, true, $5)
      returning id
      `,
      [categoryId, blockId, title, description || null, tagsConfirmed]
    );

    const libraryItemId = created.rows[0].id;

    await client.query(
      `insert into library_promotion_events
        (source_block_id, requested_category_id, outcome, created_library_item_id, duplicate_of_library_item_id, skeleton_sig, best_match_score, best_match_template_block_id, best_match_library_item_id, note)
       values
        ($1, $2, 'promoted', $3, $4, $5, $6, $7, $8, $9)`,
      [blockId, categoryId, libraryItemId, dupLibraryItemId, sk.skeletonSig, bestScore || null, dupTemplateBlockId || null, dupLibraryItemId || null, dupLibraryItemId ? "override-promote" : null]
    );

    await client.query("commit");
    return res.json({
      outcome: "promoted",
      libraryItemId,
      overriddenDuplicateOf: dupLibraryItemId,
      suggestedTags
    });
  } catch (err: any) {
    console.error(err);
    try { await client.query("rollback"); } catch {}
    return res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => console.log(`BigBio API running on port ${PORT}`));
