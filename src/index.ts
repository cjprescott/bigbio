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
  res.json({
    hasDatabaseUrl,
    databaseUrlLength: process.env.DATABASE_URL?.length ?? 0,
    nodeVersion: process.version
  });
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
    // Popular = 7-day window, weighted remixes > likes (per-template stats view).
    // If empty (all zeros), fall back to all-time.
    const q1 = await client.query(
      `select * from library_template_stats
       where popular_score_7d > 0
       order by popular_score_7d desc, remix_count_7d desc, like_count_7d desc
       limit $1`,
      [limit]
    );

    if (q1.rows.length > 0) return res.json({ items: q1.rows });

    const q2 = await client.query(
      `select * from library_template_stats
       order by popular_score_all_time desc, remix_count_all_time desc, like_count_all_time desc
       limit $1`,
      [limit]
    );
    return res.json({ items: q2.rows });
  } finally {
    client.release();
  }
});

app.get("/library/trending", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 30) || 30, 100);
  const client = await pool.connect();
  try {
    // Trending = 24h.
    // If empty (all zeros), fall back to newest.
    const q1 = await client.query(
      `select * from library_template_stats
       where trending_score_24h > 0
       order by trending_score_24h desc, remix_count_24h desc, like_count_24h desc
       limit $1`,
      [limit]
    );

    if (q1.rows.length > 0) return res.json({ items: q1.rows });

    const q2 = await client.query(
      `select * from library_template_stats
       order by library_created_at desc
       limit $1`,
      [limit]
    );
    return res.json({ items: q2.rows });
  } finally {
    client.release();
  }
});

/* -----------------------
   Likes (public blocks)
------------------------ */

/**
 * POST /blocks/:id/like
 * Body: { userId }
 * Only allowed if the block is public.
 */
app.post("/blocks/:id/like", async (req, res) => {
  const blockId = String(req.params.id).trim();
  const userId = String(req.body?.userId || "").trim();
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const client = await pool.connect();
  try {
    const b = await client.query(`select id, visibility from blocks where id = $1 limit 1`, [blockId]);
    if (b.rows.length === 0) return res.status(404).json({ error: "block not found" });

    const visibility = b.rows[0].visibility as string;
    if (visibility !== "public") return res.status(403).json({ error: "can only like public blocks" });

    await client.query(
      `insert into block_likes (block_id, user_id)
       values ($1, $2)
       on conflict do nothing`,
      [blockId, userId]
    );

    res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

/**
 * DELETE /blocks/:id/like
 * Body: { userId }
 */
app.delete("/blocks/:id/like", async (req, res) => {
  const blockId = String(req.params.id).trim();
  const userId = String(req.body?.userId || "").trim();
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const client = await pool.connect();
  try {
    await client.query(`delete from block_likes where block_id = $1 and user_id = $2`, [blockId, userId]);
    res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

/* -----------------------
   Blocks (v1 minimal)
------------------------ */

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

    // V1: new blocks are not “template-originated” unless you later create them from a library template.
    const created = await client.query(
      `insert into blocks (owner_id, visibility, is_posted, title, content, ai_tag_suggestions, origin_template_block_id)
       values ($1, $2, false, $3, $4, $5::jsonb, null)
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
 * Rule: cannot remix private parent blocks
 * Body: { ownerId, visibility }
 *
 * IMPORTANT: Sets origin_template_block_id so template usage count works.
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

    // ✅ include origin_template_block_id in the select
    const parent = await client.query(
      `select id, title, content, visibility, origin_template_block_id
       from blocks
       where id = $1
       limit 1`,
      [parentBlockId]
    );

    if (parent.rows.length === 0) {
      await client.query("rollback");
      return res.status(404).json({ error: "parent block not found" });
    }

    // Your rule: private blocks can’t be remixed
    if (parent.rows[0].visibility === "private") {
      await client.query("rollback");
      return res.status(403).json({ error: "cannot remix a private block" });
    }

    const pv = await client.query(
      `select id, version_num, title, content
       from block_versions
       where block_id = $1
       order by version_num desc
       limit 1`,
      [parentBlockId]
    );

    const parentVersionId = pv.rows.length ? (pv.rows[0].id as string) : null;
    const parentTitle = parent.rows[0].title as string | null;
    const parentContent = parent.rows[0].content as string;

    const sk = buildSkeleton(parentContent);

    // ✅ Stable lineage:
    // - If parent already has an origin_template_block_id, inherit it
    // - Else parent becomes the origin root
    const originTemplateBlockId =
      (parent.rows[0].origin_template_block_id as string | null) ?? parentBlockId;

    const suggestedTags = suggestTagsFromContent(sk.skeletonText + "\n" + parentContent);

    const child = await client.query(
      `insert into blocks (
         owner_id,
         visibility,
         is_posted,
         title,
         content,
         ai_tag_suggestions,
         origin_template_block_id
       )
       values ($1, $2, false, $3, $4, $5::jsonb, $6)
       returning id`,
      [
        ownerId,
        visibility,
        parentTitle,
        parentContent,
        JSON.stringify(suggestedTags),
        originTemplateBlockId
      ]
    );

    const childBlockId = child.rows[0].id as string;

    const childV1 = await client.query(
      `insert into block_versions (block_id, version_num, title, content, meta)
       values ($1, 1, $2, $3, $4)
       returning id`,
      [
        childBlockId,
        parentTitle,
        parentContent,
        JSON.stringify({ remixed_from: parentBlockId, parent_version_id: parentVersionId })
      ]
    );

    const childVersionId = childV1.rows[0].id as string;

    await client.query(
      `insert into remix_edges (child_block_id, parent_block_id, parent_version_id)
       values ($1, $2, $3)`,
      [childBlockId, parentBlockId, parentVersionId]
    );

    await client.query(
      `insert into block_diffs (child_block_id, parent_block_id, child_version_id, parent_version_id, diff)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [childBlockId, parentBlockId, childVersionId, parentVersionId, JSON.stringify([])]
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
      [childBlockId, sk.skeletonText, sk.skeletonSig, sk.slotCount, sk.lineCount]
    );

    await client.query("commit");
    res.json({
      id: childBlockId,
      remixedFrom: parentBlockId,
      originTemplateBlockId,
      suggestedTags
    });
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
 * Creates a new version + stores diff if block is a remix
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

    const current = await client.query(`select id, content from blocks where id = $1 limit 1`, [blockId]);
    if (current.rows.length === 0) {
      await client.query("rollback");
      return res.status(404).json({ error: "block not found" });
    }
    const oldContent = current.rows[0].content as string;

    const v = await client.query(`select coalesce(max(version_num), 0) as max_v from block_versions where block_id = $1`, [blockId]);
    const nextV = Number(v.rows[0].max_v) + 1;

    await client.query(
      `update blocks
       set title = $2,
           content = $3,
           updated_at = now(),
           ai_tag_suggestions = $4::jsonb
       where id = $1`,
      [blockId, title, content, JSON.stringify(suggestedTags)]
    );

    const newVersion = await client.query(
      `insert into block_versions (block_id, version_num, title, content, meta)
       values ($1, $2, $3, $4, '{}'::jsonb)
       returning id`,
      [blockId, nextV, title, content]
    );
    const newVersionId = newVersion.rows[0].id as string;

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

    const edge = await client.query(
      `select parent_block_id, parent_version_id from remix_edges where child_block_id = $1 limit 1`,
      [blockId]
    );

    if (edge.rows.length > 0) {
      const parentBlockId = edge.rows[0].parent_block_id as string;
      const parentVersionId = edge.rows[0].parent_version_id as string | null;

      let parentText = oldContent;
      if (parentVersionId) {
        const pv = await client.query(`select content from block_versions where id = $1 limit 1`, [parentVersionId]);
        if (pv.rows.length) parentText = pv.rows[0].content as string;
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
   Admin endpoints (kept)
------------------------ */

app.get("/admin/library/dupes", async (req, res) => {
  const blockId = String(req.query.blockId || "").trim();
  if (!blockId) return res.status(400).json({ error: "blockId is required" });

  const client = await pool.connect();
  try {
    const block = await client.query("select id, content from blocks where id = $1 limit 1", [blockId]);
    if (block.rows.length === 0) return res.status(404).json({ error: "block not found" });

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

    res.json({
      blockId,
      skeletonSig: sk.skeletonSig,
      suggestedTags,
      exact: exact.rows,
      fuzzy: fuzzy.rows,
      threshold: FUZZY_DUP_THRESHOLD
    });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => console.log(`BigBio API running on port ${PORT}`));
