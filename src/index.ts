import express from "express";
import dns from "dns";
import { pool } from "./db.js";
import { buildSkeleton } from "./skeletonize.js";
import { suggestTagsFromContent } from "./tagSuggest.js";
import { diffLines } from "./diff.js";
import cors from "cors";

dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// CORS goes HERE - after app is created
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-User-Id', 'Authorization'],
}));

app.use(express.json());
/* -----------------------
   Auth helpers (simple)
   - For now: require X-User-Id: <uuid>
   - Later: swap to real OAuth/JWT without changing handlers.
------------------------ */
function getAuthUserId(req: express.Request): string | null {
  const h = String(req.header("x-user-id") || "").trim();
  if (!h) return null;
  return h;
}

function requireAuth(req: express.Request, res: express.Response): string | null {
  const uid = getAuthUserId(req);
  if (!uid) {
    res.status(401).json({ error: "auth required (send X-User-Id header)" });
    return null;
  }
  return uid;
}

/* -----------------------
   Health
------------------------ */
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
   Profiles
------------------------ */

/**
 * GET /profiles/:handle
 * Public profile header info + live counts
 */
app.get("/profiles/:handle", async (req, res) => {
  const handle = String(req.params.handle || "").trim().toLowerCase();
  if (!handle) return res.status(400).json({ error: "handle required" });

  const client = await pool.connect();
  try {
    const p = await client.query(
      `
      select
        up.user_id,
        up.handle,
        up.avatar_url,
        up.bg_style,
        up.created_at,
        (
          select count(*)::int
          from follows f
          where f.followee_user_id = up.user_id
        ) as follower_count,
        (
          select count(*)::int
          from follows f
          where f.follower_user_id = up.user_id
        ) as following_count,
        (
          select coalesce(count(*),0)::int
          from block_likes bl
          join blocks b on b.id = bl.block_id
          where b.owner_id = up.user_id
        ) as total_likes
      from user_profiles up
      where lower(up.handle) = $1
      limit 1
      `,
      [handle]
    );

    if (p.rows.length === 0) return res.status(404).json({ error: "profile not found" });

    const viewer = getAuthUserId(req);
    const isOwner = viewer && viewer === p.rows[0].user_id;

    let viewerFollows = false;
    if (viewer) {
      const f = await client.query(
        `select 1 from follows where follower_user_id = $1 and followee_user_id = $2 limit 1`,
        [viewer, p.rows[0].user_id]
      );
      viewerFollows = f.rows.length > 0;
    }

    res.json({ ...p.rows[0], is_owner: !!isOwner, viewer_follows: viewerFollows });
  } finally {
    client.release();
  }
});

/**
 * GET /profiles/:handle/blocks?pinned=true
 * Public: only pinned blocks visible to others.
 *
 * GET /profiles/:handle/blocks?visibility=private
 * Auth-gated: ONLY owner can fetch private blocks list.
 *
 * Note: We keep ordering simple for v1:
 * - pinned: created_at asc (TODO: add pinned_order column later)
 * - public/private: created_at desc
 */
app.get("/profiles/:handle/blocks", async (req, res) => {
  const handle = String(req.params.handle || "").trim().toLowerCase();
  if (!handle) return res.status(400).json({ error: "handle required" });

  const pinned = String(req.query.pinned || "").trim().toLowerCase() === "true";
  const drafts = String(req.query.drafts || "").trim().toLowerCase() === "true";
  const visibilityQuery = String(req.query.visibility || "").trim().toLowerCase();

  const client = await pool.connect();
  try {
    const p = await client.query(
      `select user_id, handle from user_profiles where lower(handle) = $1 limit 1`,
      [handle]
    );
    if (p.rows.length === 0) return res.status(404).json({ error: "profile not found" });

    const profileUserId = p.rows[0].user_id as string;

    if (pinned) {
      const q = await client.query(
        `
        select
          b.id,
          b.owner_id,
          b.title,
          b.content,
          b.visibility,
          b.is_posted,
          b.is_pinned,
          b.pinned_order,
          b.created_at,
          b.posted_at,
          (select count(*)::int from block_likes bl where bl.block_id = b.id) as like_count,
          (select count(*)::int from remix_edges re where re.parent_block_id = b.id) as remix_count
        from blocks b
        where b.owner_id = $1
          and b.is_posted = true
          and b.is_pinned = true
          and b.visibility = 'public'
        order by b.pinned_order asc nulls last, b.posted_at desc nulls last, b.created_at desc
        `,
        [profileUserId]
      );
      return res.json({ items: q.rows });
    }

    if (drafts) {
      const viewer = requireAuth(req, res);
      if (!viewer) return;
      if (viewer !== profileUserId) {
        return res.status(403).json({ error: "drafts are only visible to the profile owner" });
      }

      const q = await client.query(
        `
        select
          b.id,
          b.owner_id,
          b.title,
          b.content,
          b.visibility,
          b.draft_visibility,
          b.is_posted,
          b.created_at,
          b.updated_at
        from blocks b
        where b.owner_id = $1
          and b.is_posted = false
        order by b.updated_at desc nulls last, b.created_at desc
        `,
        [profileUserId]
      );
      return res.json({ items: q.rows });
    }

    if (visibilityQuery === "private") {
      const viewer = requireAuth(req, res);
      if (!viewer) return;
      if (viewer !== profileUserId) {
        return res.status(403).json({ error: "private blocks are only visible to the profile owner" });
      }

      const q = await client.query(
        `
        select
          b.id,
          b.owner_id,
          b.title,
          b.content,
          b.visibility,
          b.is_posted,
          b.created_at,
          (select count(*)::int from block_likes bl where bl.block_id = b.id) as like_count,
          (select count(*)::int from remix_edges re where re.parent_block_id = b.id) as remix_count
        from blocks b
        where b.owner_id = $1
          and b.is_posted = true
          and b.visibility = 'private'
        order by b.created_at desc
        `,
        [profileUserId]
      );

      // Add the lock hint for invited users
      const blockIds = q.rows.map(r => r.id);
      const access = blockIds.length
        ? await client.query(
            `
            select
              ba.block_id,
              array_agg('@' || up.handle order by up.handle) as invited_handles
            from block_access ba
            join user_profiles up on up.user_id = ba.user_id
            where ba.block_id = any($1::uuid[])
            group by ba.block_id
            `,
            [blockIds]
          )
        : { rows: [] as any[] };

      const accessMap = new Map<string, string[]>();
      for (const row of access.rows) accessMap.set(row.block_id, row.invited_handles || []);

      const items = q.rows.map(r => {
        const invited = accessMap.get(r.id) || [];
        const lock_hint = invited.length ? `🔒🤫 ${invited.join(" ")}` : "🔒🤫";
        return { ...r, lock_hint };
      });

      return res.json({ items });
    }

    return res.status(400).json({ error: "use ?pinned=true or ?visibility=private or ?drafts=true" });
  } finally {
    client.release();
  }
});

/* -----------------------
   Follow
------------------------ */

/**
 * POST /profiles/:handle/follow
 * Auth required. Follow the profile owner.
 */
app.post("/profiles/:handle/follow", async (req, res) => {
  const viewer = requireAuth(req, res);
  if (!viewer) return;

  const handle = String(req.params.handle || "").trim().toLowerCase();
  if (!handle) return res.status(400).json({ error: "handle required" });

  const client = await pool.connect();
  try {
    const p = await client.query(
      `select user_id from user_profiles where lower(handle) = $1 limit 1`,
      [handle]
    );
    if (p.rows.length === 0) return res.status(404).json({ error: "profile not found" });

    const followee = p.rows[0].user_id as string;
    if (followee === viewer) return res.status(400).json({ error: "cannot follow yourself" });

    await client.query(
      `
      insert into follows (follower_user_id, followee_user_id)
      values ($1, $2)
      on conflict do nothing
      `,
      [viewer, followee]
    );

    // Live counts
    const counts = await client.query(
      `
      select
        (select count(*)::int from follows where followee_user_id = $1) as follower_count,
        (select count(*)::int from follows where follower_user_id = $1) as following_count
      `,
      [followee]
    );

    res.json({ ok: true, follower_count: counts.rows[0].follower_count, following_count: counts.rows[0].following_count });
  } finally {
    client.release();
  }
});

/**
 * DELETE /profiles/:handle/follow
 * Auth required.
 */
app.delete("/profiles/:handle/follow", async (req, res) => {
  const viewer = requireAuth(req, res);
  if (!viewer) return;

  const handle = String(req.params.handle || "").trim().toLowerCase();
  if (!handle) return res.status(400).json({ error: "handle required" });

  const client = await pool.connect();
  try {
    const p = await client.query(
      `select user_id from user_profiles where lower(handle) = $1 limit 1`,
      [handle]
    );
    if (p.rows.length === 0) return res.status(404).json({ error: "profile not found" });

    const followee = p.rows[0].user_id as string;

    await client.query(
      `delete from follows where follower_user_id = $1 and followee_user_id = $2`,
      [viewer, followee]
    );

    const counts = await client.query(
      `
      select
        (select count(*)::int from follows where followee_user_id = $1) as follower_count,
        (select count(*)::int from follows where follower_user_id = $1) as following_count
      `,
      [followee]
    );

    res.json({ ok: true, follower_count: counts.rows[0].follower_count, following_count: counts.rows[0].following_count });
  } finally {
    client.release();
  }
});

/* -----------------------
   Library endpoints (existing behavior)
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
       order by popular_score_7d desc
       limit $1`,
      [limit]
    );
    if (q1.rows.length > 0) return res.json({ items: q1.rows });

    const q2 = await client.query(
      `select * from library_template_stats
       order by popular_score_7d desc
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
    const q1 = await client.query(
      `select * from library_template_stats
       where trending_score_24h > 0
       order by trending_score_24h desc
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
   Feed (simple chronological)
   can_appear_in_feed = is_posted && visibility === "public"
------------------------ */
app.get("/feed", async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 30) || 30, 100);
  const client = await pool.connect();
  try {
    const q = await client.query(
      `
      select
        b.id,
        b.owner_id,
        b.title,
        b.content,
        b.created_at as feed_time,
        (
          select count(*)::int from block_likes bl where bl.block_id = b.id
        ) as like_count,
        (
          select count(*)::int from remix_edges re where re.parent_block_id = b.id
        ) as remix_count
      from blocks b
      where b.is_posted = true
        and b.visibility = 'public'
      order by b.created_at desc
      limit $1
      `,
      [limit]
    );
    res.json({ items: q.rows });
  } finally {
    client.release();
  }
});

/* -----------------------
   Likes (public blocks only)
------------------------ */
app.post("/blocks/:id/like", async (req, res) => {
  const blockId = String(req.params.id).trim();
  const userId = String(req.body?.userId || "").trim();
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const client = await pool.connect();
  try {
    const b = await client.query(`select id, visibility from blocks where id = $1 limit 1`, [blockId]);
    if (b.rows.length === 0) return res.status(404).json({ error: "block not found" });

    if (String(b.rows[0].visibility) !== "public") return res.status(403).json({ error: "can only like public blocks" });

    await client.query(
      `insert into block_likes (block_id, user_id)
       values ($1, $2)
       on conflict do nothing`,
      [blockId, userId]
    );

    res.json({ ok: true });
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
  } finally {
    client.release();
  }
});

/* -----------------------
   Blocks (create, update, remix)
------------------------ */

/**
 * POST /blocks
 * Body:
 * {
 *   ownerId,
 *   action: "draft" | "post",
 *   blockId?: uuid (required if updating an existing draft),
 *   visibility: "private"|"public"|"pinned",
 *   title?,
 *   content
 * }
 *
 * Rules:
 * - "draft": always stored as private + is_posted=false
 * - "post": can be public OR private
 *   - can_appear_in_feed = is_posted && visibility==="public"
 */
app.post("/blocks", async (req, res) => {
  const ownerId = String(req.body?.ownerId || "").trim();
  const action = String(req.body?.action || "").trim().toLowerCase();
  const blockId = req.body?.blockId ? String(req.body.blockId).trim() : null;

  let visibility = String(req.body?.visibility || "").trim().toLowerCase();
  const title = req.body?.title ? String(req.body.title).trim() : null;
  const content = String(req.body?.content || "");

  if (!ownerId) return res.status(400).json({ error: "ownerId is required" });
  if (!["draft", "post"].includes(action)) return res.status(400).json({ error: "action must be draft or post" });
  if (!content.trim()) return res.status(400).json({ error: "content is required" });

  const isPosted = action === "post";

  if (action === "draft") {
    visibility = "private";
  } else {
    if (!["private", "public", "pinned"].includes(visibility)) {
      return res.status(400).json({ error: "visibility must be private, public, or pinned" });
    }
  }

  const sk = buildSkeleton(content);
  const suggestedTags = suggestTagsFromContent(sk.skeletonText + "\n" + content);

  const client = await pool.connect();
  try {
    await client.query("begin");

    // Update existing draft if blockId is provided
    if (blockId) {
      const existing = await client.query(
        `select id, owner_id from blocks where id = $1 limit 1`,
        [blockId]
      );
      if (existing.rows.length === 0) {
        await client.query("rollback");
        return res.status(404).json({ error: "blockId not found" });
      }
      if (String(existing.rows[0].owner_id) !== ownerId) {
        await client.query("rollback");
        return res.status(403).json({ error: "not your block" });
      }

      await client.query(
        `update blocks
         set title = $2,
             content = $3,
             visibility = $4,
             is_posted = $5,
             ai_tag_suggestions = $6::jsonb,
             updated_at = now()
         where id = $1`,
        [blockId, title, content, visibility, isPosted, JSON.stringify(suggestedTags)]
      );

      // new version
      const v = await client.query(`select coalesce(max(version_num), 0) as max_v from block_versions where block_id = $1`, [blockId]);
      const nextV = Number(v.rows[0].max_v) + 1;

      await client.query(
        `insert into block_versions (block_id, version_num, title, content, meta)
         values ($1, $2, $3, $4, '{}'::jsonb)`,
        [blockId, nextV, title, content]
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
      return res.json({ id: blockId, updated: true, suggestedTags, skeletonSig: sk.skeletonSig });
    }

    // Create new block
    const created = await client.query(
      `
      insert into blocks (owner_id, visibility, is_posted, title, content, ai_tag_suggestions, origin_template_block_id)
      values ($1, $2, $3, $4, $5, $6::jsonb, null)
      returning id
      `,
      [ownerId, visibility, isPosted, title, content, JSON.stringify(suggestedTags)]
    );

    const newId = created.rows[0].id as string;

    await client.query(
      `insert into block_versions (block_id, version_num, title, content, meta)
       values ($1, 1, $2, $3, '{}'::jsonb)`,
      [newId, title, content]
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
      [newId, sk.skeletonText, sk.skeletonSig, sk.slotCount, sk.lineCount]
    );

    await client.query("commit");
    res.json({ id: newId, suggestedTags, skeletonSig: sk.skeletonSig });
  } catch (err: any) {
    console.error(err);
    try { await client.query("rollback"); } catch {}
    res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

/**
 * GET /blocks/:id
 * Handy debug endpoint.
 */
app.get("/blocks/:id", async (req, res) => {
  const blockId = String(req.params.id).trim();
  const client = await pool.connect();
  try {
    const q = await client.query(
      `
      select
        b.*,
        (select count(*)::int from block_likes bl where bl.block_id = b.id) as like_count,
        (select count(*)::int from remix_edges re where re.parent_block_id = b.id) as remix_count
      from blocks b
      where b.id = $1
      limit 1
      `,
      [blockId]
    );
    if (q.rows.length === 0) return res.status(404).json({ error: "not found" });
    res.json(q.rows[0]);
  } finally {
    client.release();
  }
});

/**
 * POST /blocks/:id/remix
 * Rule: cannot remix private parent blocks
 * Body: { ownerId, visibility }
 * - Remix creates a child block, default private draft behavior via your client.
 * - origin_template_block_id stays stable (root template).
 */
app.post("/blocks/:id/remix", async (req, res) => {
  const parentBlockId = String(req.params.id).trim();
  const ownerId = String(req.body?.ownerId || "").trim();
  const visibility = String(req.body?.visibility || "private").trim().toLowerCase();

  if (!ownerId) return res.status(400).json({ error: "ownerId is required" });
  if (!["private", "public", "pinned"].includes(visibility)) return res.status(400).json({ error: "invalid visibility" });

  const client = await pool.connect();
  try {
    await client.query("begin");

    const parent = await client.query(
      `select id, owner_id, title, content, visibility, origin_template_block_id
       from blocks
       where id = $1
       limit 1`,
      [parentBlockId]
    );
    if (parent.rows.length === 0) { await client.query("rollback"); return res.status(404).json({ error: "parent block not found" }); }

    if (String(parent.rows[0].visibility) === "private") {
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

    const originTemplateBlockId =
      (parent.rows[0].origin_template_block_id as string | null) ?? parentBlockId;

    const sk = buildSkeleton(parentContent);
    const suggestedTags = suggestTagsFromContent(sk.skeletonText + "\n" + parentContent);

    const child = await client.query(
      `
      insert into blocks (
        owner_id,
        title,
        content,
        visibility,
        is_posted,
        parent_block_id,
        origin_template_block_id,
        ai_tag_suggestions
      )
      values ($1, $2, $3, $4, false, $5, $6, $7::jsonb)
      returning id
      `,
      [ownerId, parentTitle, parentContent, visibility, parentBlockId, originTemplateBlockId, JSON.stringify(suggestedTags)]
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
       values ($1, $2, $3)
       on conflict do nothing`,
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
   Invites by handle (owner only)
------------------------ */
/**
 * POST /blocks/:id/invite
 * Body: { ownerId, invitedHandles: ["@tom","sam"] }
 */
app.post("/blocks/:id/invite", async (req, res) => {
  const blockId = String(req.params.id).trim();
  const ownerId = String(req.body?.ownerId || "").trim();
  const invitedHandles = Array.isArray(req.body?.invitedHandles) ? req.body.invitedHandles : null;

  if (!ownerId) return res.status(400).json({ error: "ownerId is required" });
  if (!invitedHandles || invitedHandles.length === 0) return res.status(400).json({ error: "invitedHandles is required" });

  const client = await pool.connect();
  try {
    await client.query("begin");

    const b = await client.query(`select id, owner_id, visibility from blocks where id = $1 limit 1`, [blockId]);
    if (b.rows.length === 0) { await client.query("rollback"); return res.status(404).json({ error: "block not found" }); }
    if (String(b.rows[0].owner_id) !== ownerId) { await client.query("rollback"); return res.status(403).json({ error: "not your block" }); }
    if (String(b.rows[0].visibility) !== "private") { await client.query("rollback"); return res.status(400).json({ error: "can only invite on private blocks" }); }

    const handles = invitedHandles
      .map((h: any) => String(h).trim().replace(/^@/, "").toLowerCase())
      .filter((h: string) => h.length > 0);

    const u = await client.query(
      `select user_id as id, handle from user_profiles where lower(handle) = any($1::text[])`,
      [handles]
    );

    let added = 0;
    for (const row of u.rows) {
      const uid = String(row.id);
      if (uid === ownerId) continue;

      const r = await client.query(
        `insert into block_access (block_id, user_id, granted_by)
         values ($1, $2, $3)
         on conflict do nothing`,
        [blockId, uid, ownerId]
      );
      if ((r.rowCount ?? 0) > 0) added += 1;
    }

    await client.query("commit");

    const total = await client.query(
      `select count(*)::int as total_with_access from block_access where block_id = $1`,
      [blockId]
    );

    res.json({
      ok: true,
      added,
      resolved: u.rows.map((r: any) => r.handle),
      total_with_access: total.rows[0].total_with_access
    });
  } catch (err: any) {
    console.error(err);
    try { await client.query("rollback"); } catch {}
    res.status(500).json({ error: err?.message ?? "unknown" });
  } finally {
    client.release();
  }
});

/* -----------------------
   Admin: dupes helper (kept)
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

    res.json({ blockId, skeletonSig: sk.skeletonSig, suggestedTags, exact: exact.rows, fuzzy: fuzzy.rows });
  } finally {
    client.release();
  }
});

app.listen(PORT, () => console.log(`BigBio API running on port ${PORT}`));
