import express from "express";
import dns from "dns";
import { pool } from "./db.js";
import { buildSkeleton } from "./skeletonize.js";
import { suggestTagsFromContent } from "./tagSuggest.js";
import { diffLines } from "./diff.js";

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

/* -----------------------
   Library (global lists)
------------------------ */

app.get("/library/new", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 30) || 30, 100);
  const client = await pool.connect();
  try {
    const q = await client.query(
      `select * from library_template_stats
       order by library_created_at desc
       limit $1`,
      [limit]
    );
    res.json({ items: q.rows });
  } finally {
    client.release();
  }
});

app.get("/library/popular", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 30) || 30, 100);
  const client = await pool.connect();
  try {
    const q = await client.query(
      `select * from library_template_stats
       order by popular_score_all_time desc, remix_count_all_time desc, like_count_all_time desc
       limit $1`,
      [limit]
    );
    res.json({ items: q.rows });
  } finally {
    client.release();
  }
});

app.get("/library/trending", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 30) || 30, 100);
  const client = await pool.connect();
  try {
    const q = await client.query(
      `select * from library_template_stats
       order by trending_score_24h desc, remix_count_24h desc, like_count_24h desc
       limit $1`,
      [limit]
    );
    res.json({ items: q.rows });
  } finally {
    client.release();
  }
});

/* -----------------------
   Blocks (v1 minimal)
------------------------ */

/**
 * POST /blocks
 * Body: { ownerId, visibility: 'private'|'public'|'pinned', title?, content }
 */
app.post("/blocks", async (req, res) => {
  const ownerId = String(req.body?.ownerId || "").trim();
  const visibility = String(req.body?.visibility || "").trim();
  const title = req.body?.title ? String(req.body.title).trim() : null;
  const content = String(req.body?.content || "");

  if (!ownerId) return res.status(400).json({ error: "ownerId is required" });
  if (!["private", "public", "pinned"].includes(visibility)) return res.status(400).json({ error: "invalid visibility" });
  if (!content.trim()) return res.status(400).json({ error: "content is required" });

  const sk = buildSkeleton(content);
  const suggestedTags = suggestTagsFromContent(sk.skeletonText + "\n" + content);

  const client = await pool.connect();
  try {
    await client.query("begin");

    const created = await client.query(
      `insert into blocks (owner_id, visibility, is_posted, title, content, ai_tag_suggestions)
       values ($1, $2, false, $3, $4, $5::jsonb)
       returning id`,
      [ownerId, visibility, title, content, JSON.stringify(suggestedTags)]
    );

    const blockId = created.rows[0].id as string;

    await client.query(
      `insert into block_versions (block_id, version_num, title, content, meta)
       values ($1, 1, $2, $3, '{}'::jsonb)`,
      [blockId, title, content]
    );

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

    await client.query("commit");
    res.json({ id: blockId, suggestedTags, skeletonSig: sk.skeletonSig });
  } catch (err: any) {
    console.error(err);
    try { await client.query("rollback"); } catch {}
    res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

/**
 * POST /blocks/:id/remix
 * Creates a child block forked from parent block.
 * Body: { ownerId, visibility }
 */
app.post("/blocks/:id/remix", async (req, res) => {
  const parentBlockId = String(req.params.id).trim();
  const ownerId = String(req.body?.ownerId || "").trim();
  const visibility = String(req.body?.visibility || "private").trim();

  if (!ownerId) return res.status(400).json({ error: "ownerId is required" });
  if (!["private", "public", "pinned"].includes(visibility)) return res.status(400).json({ error: "invalid visibility" });

  const client = await pool.connect();
  try {
    await client.query("begin");

    // Parent content + latest version
    const parent = await client.query(
      `select id, title, content from blocks where id = $1 limit 1`,
      [parentBlockId]
    );
    if (parent.rowCount === 0) {
      await client.query("rollback");
      return res.status(404).json({ error: "parent block not found" });
    }

    const pv = await client.query(
      `select id, version_num, title, content
       from block_versions
       where block_id = $1
       order by version_num desc
       limit 1`,
      [parentBlockId]
    );
    const parentVersionId = pv.rowCount ? (pv.rows[0].id as string) : null;
    const parentTitle = parent.rows[0].title as string | null;
    const parentContent = parent.rows[0].content as string;

    // Create child block as a copy (user will edit)
    const sk = buildSkeleton(parentContent);
    const suggestedTags = suggestTagsFromContent(sk.skeletonText + "\n" + parentContent);

    const child = await client.query(
      `insert into blocks (owner_id, visibility, is_posted, title, content, ai_tag_suggestions)
       values ($1, $2, false, $3, $4, $5::jsonb)
       returning id`,
      [ownerId, visibility, parentTitle, parentContent, JSON.stringify(suggestedTags)]
    );
    const childBlockId = child.rows[0].id as string;

    // Version 1 for child
    const childV1 = await client.query(
      `insert into block_versions (block_id, version_num, title, content, meta)
       values ($1, 1, $2, $3, $4)
       returning id`,
      [childBlockId, parentTitle, parentContent, JSON.stringify({ remixed_from: parentBlockId, parent_version_id: parentVersionId })]
    );
    const childVersionId = childV1.rows[0].id as string;

    // Remix edge
    await client.query(
      `insert into remix_edges (child_block_id, parent_block_id, parent_version_id)
       values ($1, $2, $3)`,
      [childBlockId, parentBlockId, parentVersionId]
    );

    // Initial diff is empty because content starts identical. Store anyway (optional).
    await client.query(
      `insert into block_diffs (child_block_id, parent_block_id, child_version_id, parent_version_id, diff)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [childBlockId, parentBlockId, childVersionId, parentVersionId, JSON.stringify([])]
    );

    // Skeleton for child (re-skeletonize)
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
      [childBlockId, sk.skeletonText, sk.skeletonSig, sk.slotCount, sk.lineCount]
    );

    await client.query("commit");
    res.json({ id: childBlockId, remixedFrom: parentBlockId, suggestedTags });
  } catch (err: any) {
    console.error(err);
    try { await client.query("rollback"); } catch {}
    res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

/**
 * PUT /blocks/:id
 * Create a new block version (edit/save).
 * Body: { title?, content }
 */
app.put("/blocks/:id", async (req, res) => {
  const blockId = String(req.params.id).trim();
  const title = req.body?.title ? String(req.body.title).trim() : null;
  const content = String(req.body?.content || "");

  if (!content.trim()) return res.status(400).json({ error: "content is required" });

  const sk = buildSkeleton(content);
  const suggestedTags = suggestTagsFromContent(sk.skeletonText + "\n" + content);

  const client = await pool.connect();
  try {
    await client.query("begin");

    // Current block
    const current = await client.query(
      `select id, content from blocks where id = $1 limit 1`,
      [blockId]
    );
    if (current.rowCount === 0) {
      await client.query("rollback");
      return res.status(404).json({ error: "block not found" });
    }
    const oldContent = current.rows[0].content as string;

    // Next version number
    const v = await client.query(
      `select coalesce(max(version_num), 0) as max_v
       from block_versions
       where block_id = $1`,
      [blockId]
    );
    const nextV = Number(v.rows[0].max_v) + 1;

    // Update blocks table
    await client.query(
      `update blocks
       set title = $2,
           content = $3,
           updated_at = now(),
           ai_tag_suggestions = $4::jsonb
       where id = $1`,
      [blockId, title, content, JSON.stringify(suggestedTags)]
    );

    // Insert new version
    const newVersion = await client.query(
      `insert into block_versions (block_id, version_num, title, content, meta)
       values ($1, $2, $3, $4, '{}'::jsonb)
       returning id`,
      [blockId, nextV, title, content]
    );
    const newVersionId = newVersion.rows[0].id as string;

    // Re-skeletonize template info
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

    // If this block is a remix, store diff against the fork parent_version
    const edge = await client.query(
      `select parent_block_id, parent_version_id
       from remix_edges
       where child_block_id = $1
       limit 1`,
      [blockId]
    );

    if (edge.rows.length > 0) {
      const parentBlockId = edge.rows[0].parent_block_id as string;
      const parentVersionId = edge.rows[0].parent_version_id as string | null;

      let parentText = oldContent;
      if (parentVersionId) {
        const pv = await client.query(`select content from block_versions where id = $1 limit 1`, [parentVersionId]);
        if (pv.rowCount) parentText = pv.rows[0].content as string;
      }

      const diff = diffLines(parentText, content);

      await client.query(
        `insert into block_diffs (child_block_id, parent_block_id, child_version_id, parent_version_id, diff)
         values ($1, $2, $3, $4, $5::jsonb)`,
        [blockId, parentBlockId, newVersionId, parentVersionId, JSON.stringify(diff)]
      );
    }

    await client.query("commit");
    res.json({ ok: true, version: nextV, suggestedTags });
  } catch (err: any) {
    console.error(err);
    try { await client.query("rollback"); } catch {}
    res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

/* -----------------------
   Admin library tools
------------------------ */

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
      select li.id as library_item_id, li.title as library_title, li.template_block_id
      from library_items li
      join block_templates bt on bt.block_id = li.template_block_id
      where bt.skeleton_sig = $1
      limit 10
      `,
      [sk.skeletonSig]
    );

    const fuzzy = await client.query(
      `
      select li.id as library_item_id, li.title as library_title, li.template_block_id,
             similarity(bt.skeleton_text, $1) as score
      from library_items li
      join block_templates bt on bt.block_id = li.template_block_id
      where bt.skeleton_text % $1
      order by score desc
      limit 10
      `,
      [sk.skeletonText]
    );

    return res.json({ blockId, skeletonSig: sk.skeletonSig, suggestedTags, exact: exact.rows, fuzzy: fuzzy.rows });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

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
  } finally {
    client.release();
  }
});

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
    if (block.rowCount === 0) { await client.query("rollback"); return res.status(404).json({ error: "block not found" }); }

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
      `select li.id as library_item_id, li.template_block_id
       from library_items li
       join block_templates bt on bt.block_id = li.template_block_id
       where bt.skeleton_sig = $1
       limit 1`,
      [sk.skeletonSig]
    );

    const fuzzy = await client.query(
      `select li.id as library_item_id, li.template_block_id, similarity(bt.skeleton_text, $1) as score
       from library_items li
       join block_templates bt on bt.block_id = li.template_block_id
       where bt.skeleton_text % $1
       order by score desc
       limit 1`,
      [sk.skeletonText]
    );

    const best = fuzzy.rows.length > 0 ? fuzzy.rows[0] : null;
    const bestScore = best ? Number(best.score) : 0;

    const dupLibraryItemId =
      exact.rows.length > 0 ? exact.rows[0].library_item_id :
      (bestScore >= FUZZY_DUP_THRESHOLD ? best?.library_item_id : null);

    const dupTemplateBlockId =
      exact.rows.length > 0 ? exact.rows[0].template_block_id :
      (bestScore >= FUZZY_DUP_THRESHOLD ? best?.template_block_id : null);

    if (dupLibraryItemId && !forcePromote) {
      await client.query(
        `insert into library_promotion_events
          (source_block_id, requested_category_id, outcome, duplicate_of_library_item_id, skeleton_sig, best_match_score, best_match_template_block_id, best_match_library_item_id, note)
         values
          ($1, $2, 'duplicate', $3, $4, $5, $6, $3, 'blocked-no-override')`,
        [blockId, categoryId, dupLibraryItemId, sk.skeletonSig, bestScore || 1.0, dupTemplateBlockId]
      );
      await client.query("commit");
      return res.json({ outcome: "duplicate", duplicateOfLibraryItemId: dupLibraryItemId, bestMatchScore: bestScore || 1.0, suggestedTags });
    }

    const created = await client.query(
      `insert into library_items (category_id, template_block_id, title, description, is_featured, is_active, tags_text)
       values ($1, $2, $3, $4, false, true, $5)
       returning id`,
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
    return res.json({ outcome: "promoted", libraryItemId, overriddenDuplicateOf: dupLibraryItemId, suggestedTags });
  } catch (err: any) {
    console.error(err);
    try { await client.query("rollback"); } catch {}
    return res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => console.log(`BigBio API running on port ${PORT}`));
