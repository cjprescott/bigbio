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
    const q1 = await client.query(
      `select * from library_template_stats
       where popular_score_7d > 0
       order by popular_score_7d desc, template_usage_7d desc
       limit $1`,
      [limit]
    );
    if (q1.rows.length > 0) return res.json({ items: q1.rows });

    const q2 = await client.query(
      `select * from library_template_stats
       order by popular_score_7d desc, template_usage_all_time desc
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
    // 24h first
    const q24 = await client.query(
      `select * from library_template_stats
       where template_usage_24h > 0
       order by template_usage_24h desc
       limit $1`,
      [limit]
    );
    if (q24.rows.length >= limit) return res.json({ items: q24.rows, window: "24h" });

    // If not enough, expand to 48h computed directly from blocks.origin_template_block_id
    const q48 = await client.query(
      `
      select
        li.id as library_item_id,
        li.title,
        li.category_id,
        li.template_block_id,
        li.created_at as library_created_at,
        coalesce(u.usage_all_time, 0)::int as template_usage_all_time,
        coalesce(u.usage_24h, 0)::int as template_usage_24h,
        coalesce(u.usage_7d, 0)::int as template_usage_7d,
        coalesce(u.usage_48h, 0)::int as template_usage_48h,
        -- keep these if present in your view, otherwise harmless
        coalesce((select count(*) from remix_edges re where re.parent_block_id = li.template_block_id), 0)::int as remix_count_all_time,
        coalesce((select count(*) from block_likes bl where bl.block_id = li.template_block_id), 0)::int as like_count_all_time,
        (coalesce(u.usage_24h,0) * 10)::int as trending_score_24h,
        (coalesce(u.usage_7d,0) * 10)::int as popular_score_7d
      from library_items li
      left join (
        select
          origin_template_block_id as template_block_id,
          count(*) filter (where id <> origin_template_block_id)::int as usage_all_time,
          count(*) filter (where id <> origin_template_block_id and created_at > now() - interval '24 hours')::int as usage_24h,
          count(*) filter (where id <> origin_template_block_id and created_at > now() - interval '48 hours')::int as usage_48h,
          count(*) filter (where id <> origin_template_block_id and created_at > now() - interval '7 days')::int as usage_7d
        from blocks
        where origin_template_block_id is not null
        group by origin_template_block_id
      ) u on u.template_block_id = li.template_block_id
      where li.is_active = true
        and coalesce(u.usage_48h,0) > 0
      order by coalesce(u.usage_48h,0) desc
      limit $1
      `,
      [limit]
    );

    if (q48.rows.length > 0) {
      // If q24 had some results, top-up with q48 without duplicates (by template_block_id)
      const seen = new Set(q24.rows.map((r: any) => r.template_block_id));
      const topped = [...q24.rows];
      for (const r of q48.rows) {
        if (!seen.has(r.template_block_id)) topped.push(r);
        if (topped.length >= limit) break;
      }
      return res.json({ items: topped, window: "48h+topup" });
    }

    // Final fallback: 7d from your view
    const q7d = await client.query(
      `select * from library_template_stats
       where template_usage_7d > 0
       order by template_usage_7d desc
       limit $1`,
      [limit]
    );
    if (q7d.rows.length > 0) return res.json({ items: q7d.rows, window: "7d" });

    return res.json({ items: [], window: "empty" });
  } finally {
    client.release();
  }
});

/* -----------------------
   Likes (public blocks)
------------------------ */

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
   Blocks
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

app.post("/blocks/:id/remix", async (req, res) => {
  const parentBlockId = String(req.params.id).trim();
  const ownerId = String(req.body?.ownerId || "").trim();
  const visibility = String(req.body?.visibility || "private").trim();

  if (!ownerId) return res.status(400).json({ error: "ownerId is required" });
  if (!["private", "public", "pinned"].includes(visibility)) return res.status(400).json({ error: "invalid visibility" });

  const client = await pool.connect();
  try {
    await client.query("begin");

    // include origin_template_block_id so we can preserve template credit
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

    if (parent.rows[0].visibility === "private") {
      await client.query("rollback");
      return res.status(403).json({ error: "cannot remix a private block" });
    }

    // Determine if parent is a library template
    const isTemplate = await client.query(
      `select 1 from library_items where template_block_id = $1 limit 1`,
      [parentBlockId]
    );

    // Origin credit rule:
    // 1) If parent already credits a template, inherit it (this credits the original template forever)
    // 2) Else if parent itself is a template, set origin to parent
    // 3) Else origin is null (don’t create fake template origins from random posts)
    const originTemplateBlockId =
      (parent.rows[0].origin_template_block_id as string | null) ??
      (isTemplate.rows.length > 0 ? parentBlockId : null);

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
      [childBlockId, parentTitle, parentContent, JSON.stringify({ remixed_from: parentBlockId, parent_version_id: parentVersionId })]
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
    res.json({ id: childBlockId, remixedFrom: parentBlockId, originTemplateBlockId, suggestedTags });
  } catch (err: any) {
    console.error(err);
    try { await client.query("rollback"); } catch {}
    res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

app.post("/blocks/:id/post", async (req, res) => {
  const blockId = String(req.params.id).trim();
  const ownerId = String(req.body?.ownerId || "").trim();
  if (!ownerId) return res.status(400).json({ error: "ownerId is required" });

  const client = await pool.connect();
  try {
    const b = await client.query(`select id, owner_id, visibility, is_posted from blocks where id = $1 limit 1`, [blockId]);
    if (b.rows.length === 0) return res.status(404).json({ error: "block not found" });
    if (b.rows[0].owner_id !== ownerId) return res.status(403).json({ error: "not your block" });
    if (b.rows[0].visibility !== "public") return res.status(403).json({ error: "can only post public blocks" });
    if (b.rows[0].is_posted === true) return res.json({ ok: true, alreadyPosted: true });

    await client.query(
      `update blocks
       set is_posted = true,
           posted_at = now(),
           updated_at = now()
       where id = $1`,
      [blockId]
    );

    res.json({ ok: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

app.get("/feed", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 100);
  const before = req.query.before ? String(req.query.before) : null; // ISO timestamp cursor

  const client = await pool.connect();
  try {
    const params: any[] = [];
    let where = `where b.visibility = 'public' and b.is_posted = true`;

    if (before) {
      params.push(before);
      where += ` and coalesce(b.posted_at, b.created_at) < $${params.length}`;
    }

    params.push(limit);

    const q = await client.query(
      `
      select
        b.id,
        b.owner_id,
        b.title,
        b.content,
        coalesce(b.posted_at, b.created_at) as feed_time,
        coalesce(lc.like_count, 0)::int as like_count,
        coalesce(rc.remix_count, 0)::int as remix_count
      from blocks b
      left join (
        select block_id, count(*)::int as like_count
        from block_likes
        group by block_id
      ) lc on lc.block_id = b.id
      left join (
        select parent_block_id as block_id, count(*)::int as remix_count
        from remix_edges
        group by parent_block_id
      ) rc on rc.block_id = b.id
      ${where}
      order by feed_time desc
      limit $${params.length}
      `,
      params
    );

    res.json({ items: q.rows });
  } finally {
    client.release();
  }
});

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
    if (current.rows.length === 0) { await client.query("rollback"); return res.status(404).json({ error: "block not found" }); }
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
   Admin endpoints
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

    res.json({ blockId, skeletonSig: sk.skeletonSig, suggestedTags, exact: exact.rows, fuzzy: fuzzy.rows, threshold: FUZZY_DUP_THRESHOLD });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => console.log(`BigBio API running on port ${PORT}`));
