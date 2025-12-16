import { pool } from "./db.js";

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    console.log("🌱 Seeding database...");
    
    // Create test users
    const users = await client.query(`
      INSERT INTO user_profiles (user_id, handle, avatar_url, bg_style)
      VALUES 
        (gen_random_uuid(), 'nightowl', '🌙', '{"preset":"midnight","angle":135,"pattern":"none"}'),
        (gen_random_uuid(), 'maya', '🦋', '{"preset":"blush","angle":180,"pattern":"none"}'),
        (gen_random_uuid(), 'kai', '⚡', '{"preset":"fire","angle":45,"pattern":"none"}')
      ON CONFLICT (handle) DO UPDATE 
        SET avatar_url = EXCLUDED.avatar_url
      RETURNING user_id, handle
    `);
    
    console.log("✅ Created users:", users.rows.map(u => u.handle));
    
    const nightowlId = users.rows.find(u => u.handle === 'nightowl')?.user_id;
    const mayaId = users.rows.find(u => u.handle === 'maya')?.user_id;
    const kaiId = users.rows.find(u => u.handle === 'kai')?.user_id;
    
    // Create blocks for nightowl
    await client.query(`
      INSERT INTO blocks (owner_id, title, content, visibility, is_posted, is_pinned, pinned_order, posted_at)
      VALUES 
        ($1, 'Bio', 'she/her ⚡\n19 ♡ pisces ♓\nlondon 🌧️', 'public', true, true, 0, NOW()),
        ($1, 'Vibes', '🎧 sad girl hours\n📷 film photography\n☕ oat milk everything\n🌙 3am thoughts', 'public', true, true, 1, NOW()),
        ($1, 'Mood', 'currently in my\n✨ delulu era ✨', 'public', true, true, 2, NOW()),
        ($1, 'Quote', '"you can''t be\neveryone''s cup of tea"\n\n— someone wise probably', 'public', true, false, null, NOW()),
        ($1, 'Draft note', 'note to self:\nstop falling for people\nwho don''t text back 🙃', 'private', false, false, null, null)
    `, [nightowlId]);
    
    // Create blocks for maya
    await client.query(`
      INSERT INTO blocks (owner_id, title, content, visibility, is_posted, is_pinned, posted_at)
      VALUES 
        ($1, 'About', '🌺 flowers\n📚 romance novels\n🍵 matcha girlie\n🌙 moon child', 'public', true, false, NOW())
    `, [mayaId]);
    
    // Create blocks for kai
    await client.query(`
      INSERT INTO blocks (owner_id, title, content, visibility, is_posted, is_pinned, posted_at)
      VALUES 
        ($1, 'Movies', 'comfort movies 🎬\n\n1. spirited away\n2. coraline\n3. ratatouille\n4. wall-e', 'public', true, false, NOW())
    `, [kaiId]);
    
    console.log("✅ Created blocks");
    
    // Add some likes
    await client.query(`
      INSERT INTO block_likes (block_id, user_id)
      SELECT b.id, $2
      FROM blocks b
      WHERE b.owner_id = $1
      LIMIT 2
    `, [nightowlId, mayaId]);
    
    console.log("✅ Added likes");
    
    await client.query("COMMIT");
    console.log("🎉 Seed complete!");
    
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();