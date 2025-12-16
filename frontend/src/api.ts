const API_BASE_URL = 'https://bigbio.onrender.com';

// For now, we'll use a hardcoded user ID (the nightowl test user)
// Later this will come from authentication
const CURRENT_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export const api = {
  // Get profile by handle
  async getProfile(handle: string) {
    const response = await fetch(`${API_BASE_URL}/profiles/${handle}`, {
      headers: {
        'X-User-Id': CURRENT_USER_ID,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch profile');
    return response.json();
  },

  // Get pinned blocks for a profile
  async getPinnedBlocks(handle: string) {
    const response = await fetch(`${API_BASE_URL}/profiles/${handle}/blocks?pinned=true`, {
      headers: {
        'X-User-Id': CURRENT_USER_ID,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch pinned blocks');
    return response.json();
  },

  // Get public blocks for a profile
  async getPublicBlocks(handle: string) {
    const response = await fetch(`${API_BASE_URL}/profiles/${handle}/blocks?visibility=public`, {
      headers: {
        'X-User-Id': CURRENT_USER_ID,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch public blocks');
    return response.json();
  },

  // Get private blocks (owner only)
  async getPrivateBlocks(handle: string) {
    const response = await fetch(`${API_BASE_URL}/profiles/${handle}/blocks?visibility=private`, {
      headers: {
        'X-User-Id': CURRENT_USER_ID,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch private blocks');
    return response.json();
  },

  // Get drafts (owner only)
  async getDrafts(handle: string) {
    const response = await fetch(`${API_BASE_URL}/profiles/${handle}/blocks?drafts=true`, {
      headers: {
        'X-User-Id': CURRENT_USER_ID,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch drafts');
    return response.json();
  },

  // Get single block
  async getBlock(blockId: string) {
    const response = await fetch(`${API_BASE_URL}/blocks/${blockId}`);
    if (!response.ok) throw new Error('Failed to fetch block');
    return response.json();
  },

  // Create new block
  async createBlock(data: {
    action: 'draft' | 'post';
    visibility: 'private' | 'public' | 'pinned';
    title?: string;
    content: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/blocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': CURRENT_USER_ID,
      },
      body: JSON.stringify({
        ownerId: CURRENT_USER_ID,
        ...data,
      }),
    });
    if (!response.ok) throw new Error('Failed to create block');
    return response.json();
  },

  // Update block
  async updateBlock(blockId: string, data: { title?: string; content: string }) {
    const response = await fetch(`${API_BASE_URL}/blocks/${blockId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': CURRENT_USER_ID,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update block');
    return response.json();
  },

  // Like a block
  async likeBlock(blockId: string) {
    const response = await fetch(`${API_BASE_URL}/blocks/${blockId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: CURRENT_USER_ID }),
    });
    if (!response.ok) throw new Error('Failed to like block');
    return response.json();
  },

  // Unlike a block
  async unlikeBlock(blockId: string) {
    const response = await fetch(`${API_BASE_URL}/blocks/${blockId}/like`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: CURRENT_USER_ID }),
    });
    if (!response.ok) throw new Error('Failed to unlike block');
    return response.json();
  },

  // Get feed
  async getFeed(limit = 30) {
    const response = await fetch(`${API_BASE_URL}/feed?limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch feed');
    return response.json();
  },

  // Follow a profile
  async follow(handle: string) {
    const response = await fetch(`${API_BASE_URL}/profiles/${handle}/follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': CURRENT_USER_ID,
      },
    });
    if (!response.ok) throw new Error('Failed to follow');
    return response.json();
  },

  // Unfollow a profile
  async unfollow(handle: string) {
    const response = await fetch(`${API_BASE_URL}/profiles/${handle}/follow`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': CURRENT_USER_ID,
      },
    });
    if (!response.ok) throw new Error('Failed to unfollow');
    return response.json();
  },

  // Get current user ID (for reference)
  getCurrentUserId() {
    return CURRENT_USER_ID;
  },
};