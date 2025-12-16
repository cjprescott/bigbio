const API_BASE = import.meta.env.VITE_API_URL || 'https://bigbio.onrender.com';

export const api = {
  // Profiles
  async getProfile(handle: string) {
    const res = await fetch(`${API_BASE}/profiles/${handle}`);
    if (!res.ok) throw new Error('Profile not found');
    return res.json();
  },

  // Blocks - read
  async getPinnedBlocks(handle: string) {
    const res = await fetch(`${API_BASE}/profiles/${handle}/blocks?pinned=true`);
    if (!res.ok) throw new Error('Failed to fetch blocks');
    const data = await res.json();
    return data.items || [];
  },

  async getDrafts(handle: string, userId: string) {
    const res = await fetch(`${API_BASE}/profiles/${handle}/blocks?drafts=true`, {
      headers: { 'X-User-Id': userId }
    });
    if (!res.ok) throw new Error('Failed to fetch drafts');
    const data = await res.json();
    return data.items || [];
  },

  async getPrivateBlocks(handle: string, userId: string) {
    const res = await fetch(`${API_BASE}/profiles/${handle}/blocks?visibility=private`, {
      headers: { 'X-User-Id': userId }
    });
    if (!res.ok) throw new Error('Failed to fetch private blocks');
    const data = await res.json();
    return data.items || [];
  },

  async getBlock(blockId: string) {
    const res = await fetch(`${API_BASE}/blocks/${blockId}`);
    if (!res.ok) throw new Error('Block not found');
    return res.json();
  },

  // Blocks - write
  async createBlock(data: {
    ownerId: string;
    action: 'draft' | 'post';
    visibility?: 'public' | 'private' | 'pinned';
    title?: string;
    content: string;
    blockId?: string;
  }) {
    const res = await fetch(`${API_BASE}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create block');
    return res.json();
  },

  async updateBlock(blockId: string, data: { title?: string; content: string }) {
    const res = await fetch(`${API_BASE}/blocks/${blockId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update block');
    return res.json();
  },

  // Likes
  async likeBlock(blockId: string, userId: string) {
    const res = await fetch(`${API_BASE}/blocks/${blockId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to like block');
    return res.json();
  },

  async unlikeBlock(blockId: string, userId: string) {
    const res = await fetch(`${API_BASE}/blocks/${blockId}/like`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to unlike block');
    return res.json();
  },

  // Feed
  async getFeed(limit = 30) {
    const res = await fetch(`${API_BASE}/feed?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch feed');
    const data = await res.json();
    return data.items || [];
  },

  // Library
  async getLibraryTrending(limit = 30) {
    const res = await fetch(`${API_BASE}/library/trending?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch trending');
    const data = await res.json();
    return data.items || [];
  },

  async getLibraryPopular(limit = 30) {
    const res = await fetch(`${API_BASE}/library/popular?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch popular');
    const data = await res.json();
    return data.items || [];
  },

  async getLibraryNew(limit = 30) {
    const res = await fetch(`${API_BASE}/library/new?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch new');
    const data = await res.json();
    return data.items || [];
  },
};