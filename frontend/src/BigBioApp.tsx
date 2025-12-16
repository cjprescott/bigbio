import React, { useState, useRef, useMemo, useEffect } from 'react';
import { api } from './api';

// ============================================================================
// ICONS
// ============================================================================

const Icons = {
  Heart: ({ filled = false, size = 16 }: { filled?: boolean; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Comment: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  Remix: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  Close: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Pin: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  ),
  Globe: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  Lock: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Grip: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
    </svg>
  ),
  ChevronLeft: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  ChevronRight: ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  Search: ({ size = 16, className = '', style = {} }: { size?: number; className?: string; style?: React.CSSProperties }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}>
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  X: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Undo: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" /><path d="M3 13a9 9 0 1 0 3-7.7L3 7" />
    </svg>
  ),
  Redo: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" /><path d="M21 13a9 9 0 1 1-3-7.7L21 7" />
    </svg>
  ),
  Check: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  Link: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
};

// ============================================================================
// THEME SYSTEM
// ============================================================================

const STYLE_PRESETS = [
  { id: 'midnight', name: 'Midnight', colors: ['#0f0c29', '#302b63', '#24243e'], textColor: '#ffffff', category: 'dark' },
  { id: 'noir', name: 'Noir', colors: ['#000000', '#1a1a1a', '#2d2d2d'], textColor: '#ffffff', category: 'dark' },
  { id: 'deep-space', name: 'Deep Space', colors: ['#000428', '#004e92'], textColor: '#e0f4ff', category: 'dark' },
  { id: 'dark-ocean', name: 'Dark Ocean', colors: ['#0f2027', '#203a43', '#2c5364'], textColor: '#a8e6cf', category: 'dark' },
  { id: 'cosmic', name: 'Cosmic', colors: ['#0f0f23', '#1a1a3e', '#2d1b4e'], textColor: '#ff9ff3', category: 'dark' },
  { id: 'fire', name: 'Fire', colors: ['#8b0000', '#cc2200', '#ff4500'], textColor: '#ffffff', category: 'vibrant' },
  { id: 'ocean-deep', name: 'Ocean', colors: ['#003366', '#004488', '#0055aa'], textColor: '#b3e0ff', category: 'vibrant' },
  { id: 'forest', name: 'Forest', colors: ['#1a4d1a', '#266626', '#338033'], textColor: '#d4ffd4', category: 'vibrant' },
  { id: 'blush', name: 'Blush', colors: ['#fff5f5', '#ffe8e8', '#ffdada'], textColor: '#4a2c2c', category: 'light' },
  { id: 'cream', name: 'Cream', colors: ['#fffef5', '#faf8f0', '#f5f3eb'], textColor: '#2d2a26', category: 'light' },
  { id: 'vaporwave', name: 'Vaporwave', colors: ['#1a0033', '#330066', '#660099'], textColor: '#00ffff', category: 'aesthetic' },
  { id: 'noir-pink', name: 'Noir Pink', colors: ['#0d0d0d', '#1a1a1a'], textColor: '#ff6b9d', category: 'aesthetic' },
];

const STYLE_CATEGORIES = [
  { id: 'dark', name: 'Dark', icon: '🌙' },
  { id: 'vibrant', name: 'Vibrant', icon: '⚡' },
  { id: 'light', name: 'Light', icon: '☁️' },
  { id: 'aesthetic', name: 'Aesthetic', icon: '✨' },
];

const ThemeUtils = {
  getStyleFromSettings: (settings: any, presets = STYLE_PRESETS) => {
    const preset = presets.find(p => p.id === settings.preset);
    return {
      colors: settings.customColors || preset?.colors || ['#000', '#333'],
      textColor: settings.customTextColor || preset?.textColor || '#ffffff',
    };
  },
  generateBackground: (settings: any, presets = STYLE_PRESETS) => {
    const { colors } = ThemeUtils.getStyleFromSettings(settings, presets);
    return `linear-gradient(${settings.angle || 135}deg, ${colors.join(', ')})`;
  },
  getPatternStyle: (settings: any, textColor: string) => {
    if (settings.pattern === 'dots') {
      return { backgroundImage: `radial-gradient(circle, ${textColor}15 1px, transparent 1px)`, backgroundSize: '16px 16px' };
    }
    if (settings.pattern === 'grid') {
      return { backgroundImage: `linear-gradient(${textColor}08 1px, transparent 1px), linear-gradient(90deg, ${textColor}08 1px, transparent 1px)`, backgroundSize: '20px 20px' };
    }
    return {};
  },
  formatRelativeTime: (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return '1d';
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
    return `${Math.floor(diffDays / 30)}mo`;
  },
};

// ============================================================================
// BLOCK LIBRARY DATA
// ============================================================================

const BLOCK_LIBRARY = [
  { id: 't01', title: 'BOYFRIEND LIST', content: 'BOYFRIEND LIST\n👀 Jake\n👀 Marcus\n👀 Tyler\n❤️ Noah', remixes: 456, category: 'lists' },
  { id: 't02', title: 'ALBUMS ON REPEAT', content: 'ALBUMS ON REPEAT 🎵\n\n1. Brat\n2. SOS\n3. GUTS\n4. Eternal Sunshine', remixes: 234, category: 'lists' },
  { id: 't03', title: 'COMFORT MOVIES', content: 'COMFORT MOVIES 🎬\n\n1. Spirited Away\n2. Coraline\n3. Ratatouille\n4. Wall-E', remixes: 289, category: 'lists' },
  { id: 't04', title: 'SHOUT OUTS', content: 'SHOUT OUTS\n🥇 Mia (always there)\n🥈 Zoe (best advice)\n🥉 Lily (chaos partner)', remixes: 178, category: 'lists' },
  { id: 't10', title: 'MSK', content: 'MSK\n👰‍♀️ Timothée\n🤤 Pedro\n🗡️ my ex lol', remixes: 892, category: 'play' },
  { id: 't11', title: 'ME BINGO', content: 'ME BINGO\n🟩 texts back fast\n🟩 says "same" too much\n🟥 claims "i\'m fine"\n🟥 disappears for hours', remixes: 567, category: 'play' },
  { id: 't12', title: '£10 SWEETSHOP', content: '£10 SWEETSHOP\n💰💰💰💰 Haribo\n💰💰 Maltesers\n💰💰 Skittles\n💰💰 Fudge', remixes: 234, category: 'play' },
  { id: 't13', title: '2 TRUTHS + 1 WISH', content: '2 TRUTHS + 1 WISH\n✅ I cry at adverts\n✅ Never been on a plane\n✨ I wish I was braver', remixes: 445, category: 'play' },
  { id: 't14', title: 'HOT TAKE COURT', content: 'HOT TAKE COURT\nCase: "Pineapple on pizza"\n👨‍⚖️ INNOCENT\n🧨 GUILTY', remixes: 678, category: 'play' },
  { id: 't20', title: 'BIO BASICS', content: 'she/her ⚡\n19 ♡ pisces ♓\nlondon 🌧️', remixes: 1234, category: 'identity' },
  { id: 't21', title: 'PERSONA', content: '👑 main character energy\n🖤 chaos coordinator\n✨ professional overthinker', remixes: 567, category: 'identity' },
  { id: 't22', title: 'EVERYONE THINKS / ACTUALLY', content: 'EVERYONE THINKS / ACTUALLY\nThey think: confident\nActually: anxious wreck', remixes: 489, category: 'identity' },
  { id: 't23', title: 'WHO I AM AROUND', content: 'WHO I AM AROUND\nFriends → loud\nFamily → quiet\nSchool → focused\nAlone → unhinged', remixes: 345, category: 'identity' },
  { id: 't30', title: 'SKILL TREE', content: 'SKILL TREE 🌳\n🗣️ confidence: ◉◉◉○○\n🧠 focus: ◉◉○○○\n❤️ kindness: ◉◉◉◉○', remixes: 789, category: 'reviews' },
  { id: 't31', title: 'FRIENDSHIP STOCKS', content: 'FRIENDSHIP STOCKS\n📈 Emma: +12 (saved me)\n📉 Jake: -8 (ghosted)', remixes: 567, category: 'reviews' },
  { id: 't32', title: 'RATE ME', content: 'RATE ME\nHumour ⭐⭐⭐⭐\nPatience ⭐⭐\nLoyalty ⭐⭐⭐⭐⭐', remixes: 456, category: 'reviews' },
  { id: 't40', title: 'ENERGY MAP', content: 'ENERGY MAP\n🔋 Gives energy:\n— rainy walks\n— good playlists\n🪫 Drains:\n— small talk', remixes: 567, category: 'deep' },
  { id: 't41', title: 'INTERNAL RULES', content: 'INTERNAL RULES\n— never double text\n— always say goodbye\n— trust your gut\n— rest is productive', remixes: 678, category: 'deep' },
  { id: 't42', title: 'QUIETLY PROUD OF', content: 'QUIETLY PROUD OF 🤭\n— setting boundaries\n— showing up anyway\n— being kinder to myself', remixes: 890, category: 'deep' },
  { id: 't60', title: 'IF THIS → THEN ME', content: 'IF THIS → THEN ME 🤖\n📩 "we need to talk" → panic\n🧃 no food → feral mode\n🎧 rain + music → main character', remixes: 1234, category: 'trending' },
  { id: 't61', title: 'MY ORBITS', content: 'MY ORBITS 🪐\n☀️ Sun: bestie\n🌙 Moon: close ones\n🛰️ Satellites: situationships', remixes: 890, category: 'trending' },
  { id: 't62', title: 'TINY TRUTHS', content: 'TINY TRUTHS 🧠\n🧊 cold air = instant sad\n🍟 chips fix everything\n🎧 that song = forgiveness', remixes: 890, category: 'trending' },
  { id: 't63', title: 'MOOD DIAL', content: 'MOOD DIAL 🎛️\n⚡ spikes: compliments\n🧨 drops: "k" texts\n🔁 reset: hot shower', remixes: 789, category: 'trending' },
];

const APP_CATEGORIES = [
  { id: 'spotify', name: 'Spotify', icon: '🎵', color: '#1DB954', isApp: true },
  { id: 'minecraft', name: 'Minecraft', icon: '⛏️', color: '#5D7C15', isApp: true },
  { id: 'roblox', name: 'Roblox', icon: '🎮', color: '#E2231A', isApp: true },
  { id: 'fortnite', name: 'Fortnite', icon: '🎯', color: '#9D4DBB', isApp: true },
];

const APP_BLOCKS = [
  { id: 'a01', title: 'TOP 5 SONGS', content: 'TOP 5 SONGS 🎵\n\n1. Espresso - Sabrina\n2. 365 - Charli\n3. Guess - Charli\n4. Birds of a Feather\n5. Good Luck, Babe!', remixes: 2341, category: 'spotify', app: 'spotify' },
  { id: 'a02', title: 'LISTENING PERSONALITY', content: 'LISTENING PERSONALITY\n🎧 Top genre: Pop\n⏰ Peak time: 2am\n🔁 Most replayed: that one song\n💔 Guilty pleasure: early 2010s', remixes: 1567, category: 'spotify', app: 'spotify' },
  { id: 'a03', title: 'ARTIST WRAPPED', content: 'ARTIST WRAPPED 🎤\n👑 #1: Charli XCX\n🥈 #2: Sabrina Carpenter\n🥉 #3: Billie Eilish\n⏱️ 847 hours total', remixes: 1823, category: 'spotify', app: 'spotify' },
  { id: 'a10', title: 'MINECRAFT STATS', content: 'MINECRAFT STATS ⛏️\n🏠 Builds: 47\n💀 Deaths: 892 (oops)\n🐷 Pets named: 12\n⏱️ Hours: too many', remixes: 934, category: 'minecraft', app: 'minecraft' },
  { id: 'a20', title: 'ROBLOX AESTHETIC', content: 'ROBLOX AESTHETIC\n👤 Avatar vibe: cottagecore\n🎮 Main game: Bloxburg\n💰 Robux spent: don\'t ask\n💯 Squad size: 4', remixes: 1245, category: 'roblox', app: 'roblox' },
  { id: 'a30', title: 'FORTNITE STATS', content: 'FORTNITE STATS 🎯\n🏆 Wins: 127\n💀 Elims: 2,847\n🎨 Fav skin: fishstick\n🗺️ Drop spot: pleasant', remixes: 1456, category: 'fortnite', app: 'fortnite' },
];

const ALL_BLOCKS = [...BLOCK_LIBRARY, ...APP_BLOCKS];

const BLOCK_CATEGORIES = [
  { id: 'drafts', name: 'Drafts', icon: '📝' },
  { id: 'trending', name: 'Trending', icon: '🔥' },
  { id: 'lists', name: 'Lists', icon: '📋' },
  { id: 'play', name: 'Play', icon: '🎮' },
  { id: 'identity', name: 'Identity', icon: '🪞' },
  { id: 'reviews', name: 'Reviews', icon: '⭐' },
  { id: 'deep', name: 'Deep', icon: '🧠' },
  ...APP_CATEGORIES,
];

const CHAR_LIMIT = 180;

const extractEmojis = (text: string) => {
  if (!text) return [];
  const matches = text.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[◉○⭐♡✅❌🟩🟥📈📉💰☀️🌙🛰️☄️⚡]/gu) || [];
  return [...new Set(matches)].slice(0, 12);
};

// ============================================================================
// UI COMPONENTS
// ============================================================================

const Avatar = ({ emoji, size = 'md', className = '', style = {} }: any) => {
  const sizes: any = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-lg', lg: 'w-16 h-16 text-2xl' };
  return (
    <div className={`rounded-full bg-black/20 flex items-center justify-center flex-shrink-0 ${sizes[size]} ${className}`} style={style}>
      {emoji}
    </div>
  );
};

const IconButton = ({ icon: Icon, size = 16, active = false, onClick, title, color, hoverColor, className = '' }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${active ? 'bg-white/20' : 'hover:bg-white/10'} ${className}`}
      style={{ color: isHovered && !active && hoverColor ? hoverColor : color }}
      title={title}
    >
      <Icon size={size} />
    </button>
  );
};

const ActionBar = ({ likes, comments, onRemix, textColor }: any) => (
  <div className="flex items-center gap-6">
    <button className="flex items-center gap-2 transition-colors hover:opacity-80" style={{ color: textColor + '90' }}>
      <Icons.Heart size={18} />
      <span className="text-sm">{likes?.toLocaleString() || 0}</span>
    </button>
    <button className="flex items-center gap-2 transition-colors hover:opacity-80" style={{ color: textColor + '90' }}>
      <Icons.Comment size={18} />
      <span className="text-sm">{comments || 0}</span>
    </button>
    <div className="flex-1" />
    <button className="flex items-center gap-2 text-sm transition-colors hover:opacity-80" style={{ color: textColor + '90' }} onClick={onRemix}>
      <Icons.Remix size={18} />
      <span>remix</span>
    </button>
  </div>
);

const TabBar = ({ activeTab, onTabChange, tabs }: any) => (
  <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/10 z-40">
    <div className="max-w-md mx-auto flex">
      {tabs.map((tab: any) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-4 text-center transition-colors ${activeTab === tab.id ? 'text-white' : 'text-white/40'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  </div>
);

const SegmentedControl = ({ segments, activeSegment, onSegmentChange, textColor, counts = {}, refs = {}, pulsingSegment = null }: any) => (
  <div className="flex gap-2 text-xs">
    {segments.map((segment: any) => (
      <button
        key={segment.id}
        ref={refs[segment.id]}
        onClick={() => onSegmentChange(segment.id)}
        className={`px-3 py-1.5 rounded-full backdrop-blur transition-all flex items-center gap-1.5 ${pulsingSegment === segment.id ? 'animate-pulse' : ''}`}
        style={{ 
          backgroundColor: activeSegment === segment.id ? textColor + '30' : 'transparent',
          color: activeSegment === segment.id ? textColor : textColor + '60',
          transform: pulsingSegment === segment.id ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {segment.icon}
        {segment.label}
        <span className={`transition-all ${pulsingSegment === segment.id ? 'font-bold' : 'opacity-60'}`}>
          ({counts[segment.id] || 0})
        </span>
      </button>
    ))}
  </div>
);

const EmptyState = ({ icon, message, textColor }: any) => (
  <div className="text-center py-12 opacity-60" style={{ color: textColor }}>
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-sm">{message}</div>
  </div>
);

const LoadingState = ({ textColor }: any) => (
  <div className="text-center py-12" style={{ color: textColor }}>
    <div className="text-2xl mb-2 animate-spin">⏳</div>
    <div className="text-sm opacity-60">Loading...</div>
  </div>
);

const ErrorState = ({ message, textColor, onRetry }: any) => (
  <div className="text-center py-12" style={{ color: textColor }}>
    <div className="text-2xl mb-2">😕</div>
    <div className="text-sm opacity-60 mb-4">{message}</div>
    {onRetry && (
      <button onClick={onRetry} className="px-4 py-2 rounded-full bg-white/10 text-sm hover:bg-white/20">Try Again</button>
    )}
  </div>
);

// ============================================================================
// BLOCK COMPONENTS
// ============================================================================

const BlockContent = ({ content, textColor }: any) => (
  <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed" style={{ color: textColor }}>
    {content}
  </div>
);

const MinimalBlock = ({ block, style, onTap, onStatusChange, isDraggable = false, onDragStart, onDragOver, onDragEnd }: any) => {
  const [isHovered, setIsHovered] = useState(false);
  const textColor = style.textColor;
  const getStatus = () => {
    if (block.is_pinned) return 'pinned';
    if (block.visibility === 'public') return 'public';
    return 'private';
  };
  const status = block.status || getStatus();
  
  return (
    <div className="relative group" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="absolute inset-0 -left-28 -right-28 pointer-events-auto" style={{ zIndex: 0 }} />
      {(block.like_count > 0 || block.likes > 0 || block.remix_count > 0) && (
        <div className="absolute top-1/2 -translate-y-1/2 -left-6 -translate-x-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3 z-10">
          {(block.like_count > 0 || block.likes > 0) && (
            <div className="flex items-center gap-1.5" style={{ color: textColor + '70' }}>
              <Icons.Heart size={14} />
              <span className="text-xs">{(block.like_count || block.likes || 0).toLocaleString()}</span>
            </div>
          )}
          {block.remix_count > 0 && (
            <div className="flex items-center gap-1.5" style={{ color: textColor + '70' }}>
              <Icons.Remix size={14} />
              <span className="text-xs">{block.remix_count}</span>
            </div>
          )}
        </div>
      )}
      <div 
        className="relative transition-all duration-200 px-3 rounded-lg select-none z-10"
        style={{ paddingTop: '12px', paddingBottom: '12px', backgroundColor: isHovered ? `${textColor}08` : 'transparent', cursor: isDraggable ? 'grab' : 'pointer' }}
        onClick={() => onTap?.(block)}
        draggable={isDraggable}
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', block.id.toString()); onDragStart?.(block.id); }}
        onDragOver={(e) => { e.preventDefault(); onDragOver?.(e, block.id); }}
        onDragEnd={() => onDragEnd?.()}
      >
        <div className="flex gap-3 items-start w-full">
          <div className="flex-1"><BlockContent content={block.content} textColor={textColor} /></div>
        </div>
        {isDraggable && (
          <div className="absolute top-1/2 -translate-y-1/2 left-0 opacity-0 group-hover:opacity-60 transition-opacity z-10" style={{ color: textColor }}>
            <Icons.Grip size={14} />
          </div>
        )}
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 -right-6 translate-x-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10" onClick={(e) => e.stopPropagation()}>
        <IconButton icon={Icons.Pin} active={status === 'pinned'} onClick={(e: any) => onStatusChange?.(block.id, 'pinned', e)} color={status === 'pinned' ? textColor : textColor + '60'} hoverColor={textColor} title={status === 'pinned' ? 'Pinned' : 'Pin to profile'} />
        <IconButton icon={Icons.Globe} active={status === 'public'} onClick={(e: any) => onStatusChange?.(block.id, 'public', e)} color={status === 'public' ? textColor : textColor + '60'} hoverColor={textColor} title={status === 'public' ? 'Public' : 'Make public'} />
        <IconButton icon={Icons.Lock} active={status === 'private'} onClick={(e: any) => onStatusChange?.(block.id, 'private', e)} color={status === 'private' ? textColor : textColor + '60'} hoverColor={textColor} title={status === 'private' ? 'Private' : 'Make private'} />
      </div>
    </div>
  );
};

const FeedBlock = ({ block, style, onTap }: any) => {
  const userStyle = block.user?.style || { preset: 'midnight', pattern: 'none', angle: 135 };
  const background = ThemeUtils.generateBackground(userStyle);
  const pattern = ThemeUtils.getPatternStyle(userStyle, style.textColor);
  
  return (
    <div className="rounded-2xl overflow-hidden relative cursor-pointer" style={{ background }} onClick={() => onTap?.(block)}>
      <div className="absolute inset-0 pointer-events-none" style={pattern} />
      <div className="relative z-10">
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${style.textColor}15` }}>
          <Avatar emoji={block.user?.avatar || '👤'} size="md" />
          <div className="flex-1">
            <div className="text-sm font-medium" style={{ color: style.textColor }}>{block.user?.name || 'Unknown'}</div>
            <div className="text-xs" style={{ color: style.textColor + '70' }}>
              {block.user?.handle || '@unknown'} · {ThemeUtils.formatRelativeTime(block.created_at || block.created || new Date().toISOString())}
            </div>
          </div>
        </div>
        <div className="px-4 py-4"><BlockContent content={block.content} textColor={style.textColor} /></div>
        <div className="px-4 py-3" style={{ borderTop: `1px solid ${style.textColor}15` }}>
          <ActionBar likes={block.like_count || block.likes} comments={block.remix_count || 0} textColor={style.textColor} />
        </div>
      </div>
    </div>
  );
};

const ModalBlock = ({ block, style, onClose }: any) => {
  const [commentText, setCommentText] = useState('');
  const userStyle = block.user?.style || { preset: 'midnight', pattern: 'none', angle: 135 };
  const background = ThemeUtils.generateBackground(userStyle);
  const pattern = ThemeUtils.getPatternStyle(userStyle, style.textColor);
  
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="max-w-md w-full max-h-[85vh] flex flex-col rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex-1 overflow-y-auto">
          <div className="rounded-t-2xl overflow-hidden relative" style={{ background }}>
            <div className="absolute inset-0 pointer-events-none" style={pattern} />
            <div className="relative z-10">
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: `1px solid ${style.textColor}15` }}>
                <Avatar emoji={block.user?.avatar || '👤'} size="md" />
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: style.textColor }}>{block.user?.name || 'You'}</div>
                  <div className="text-xs" style={{ color: style.textColor + '70' }}>
                    {block.user?.handle || '@you'} · {ThemeUtils.formatRelativeTime(block.created_at || block.created || new Date().toISOString())}
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center hover:bg-black/30 transition-colors" style={{ color: style.textColor + '80' }}>
                  <Icons.Close size={18} />
                </button>
              </div>
              <div className="px-4 py-4"><BlockContent content={block.content} textColor={style.textColor} /></div>
              <div className="px-4 py-3" style={{ borderTop: `1px solid ${style.textColor}15` }}>
                <ActionBar likes={block.like_count || block.likes} comments={block.remix_count || 0} textColor={style.textColor} />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 rounded-b-2xl">
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">🌙</div>
          <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="flex-1 text-sm bg-gray-100 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-gray-200 text-gray-900 placeholder-gray-400" />
          <button className={`text-sm font-medium transition-colors ${commentText.trim() ? 'text-pink-500 hover:text-pink-600' : 'text-gray-300'}`} disabled={!commentText.trim()}>Post</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// STYLE PICKER
// ============================================================================

const StylePicker = ({ isOpen, onClose, currentStyle, onStyleChange, presets }: any) => {
  const [selectedCategory, setSelectedCategory] = useState('dark');
  if (!isOpen) return null;
  const filteredPresets = presets.filter((p: any) => p.category === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-48">
        <div className="max-w-lg mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-lg font-medium">style</h2>
            <button onClick={onClose} className="text-white/60 hover:text-white"><Icons.Close size={20} /></button>
          </div>
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {STYLE_CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${selectedCategory === cat.id ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                <span>{cat.icon}</span><span>{cat.name}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {filteredPresets.map((preset: any) => (
              <button key={preset.id} onClick={() => onStyleChange({ ...currentStyle, preset: preset.id })} className={`aspect-[4/3] rounded-xl transition-all overflow-hidden ${currentStyle.preset === preset.id ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`} style={{ background: `linear-gradient(135deg, ${preset.colors.join(', ')})` }}>
                <div className="w-full h-full flex flex-col items-center justify-center p-3">
                  <div className="font-mono text-xs text-center leading-relaxed" style={{ color: preset.textColor }}>{`✨ ${preset.name}\n♡ preview`}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 p-4">
        <div className="max-w-lg mx-auto">
          <button onClick={onClose} className="w-full py-3 bg-white text-black rounded-xl font-medium hover:bg-gray-100 transition-colors">done</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CREATE VIEW - Full Block Editor with Library
// ============================================================================

interface CreateViewProps {
  userStyle: any;
  onClose: () => void;
  onPost: (block: any) => void;
  apiDrafts?: any[];
}

function CreateView({ userStyle, onClose, onPost, apiDrafts = [] }: CreateViewProps) {
  const [content, setContent] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [status, setStatus] = useState<'pinned' | 'public' | 'private'>('public');
  const [expandedPanel, setExpandedPanel] = useState('library');
  const [libraryCategory, setLibraryCategory] = useState<string | null>('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<any[]>(apiDrafts);
  const [searchFocused, setSearchFocused] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const [sentToEditor, setSentToEditor] = useState<string | null>(null);
  const [connectedApps, setConnectedApps] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState(['boyfriend list', 'spotify', 'mood']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const expandedBlockRef = useRef<HTMLDivElement>(null);
  
  const currentStyle = ThemeUtils.getStyleFromSettings(userStyle, STYLE_PRESETS);
  const textColor = currentStyle.textColor;
  const blockBg = ThemeUtils.generateBackground(userStyle, STYLE_PRESETS);
  
  const contentEmojis = useMemo(() => extractEmojis(content), [content]);
  
  const filteredLibraryBlocks = useMemo(() => {
    if (libraryCategory === 'drafts') return drafts;
    let blocks = ALL_BLOCKS;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return blocks.filter(b => b.title.toLowerCase().includes(q) || b.content.toLowerCase().includes(q));
    }
    if (!libraryCategory || libraryCategory === 'trending') {
      return [...blocks].sort((a, b) => b.remixes - a.remixes).slice(0, 10);
    }
    return blocks.filter(b => b.category === libraryCategory);
  }, [libraryCategory, searchQuery, drafts]);
  
  useEffect(() => {
    if (filteredLibraryBlocks.length > 0 && expandedPanel === 'library' && libraryCategory) {
      setExpandedBlockId(filteredLibraryBlocks[0].id);
      setSentToEditor(null);
    }
  }, [libraryCategory, expandedPanel]);
  
  useEffect(() => {
    if (searchQuery && filteredLibraryBlocks.length > 0 && expandedPanel === 'library') {
      const timer = setTimeout(() => {
        setExpandedBlockId(filteredLibraryBlocks[0].id);
        setSentToEditor(null);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);
  
  const getBlockParts = (blockContent: string) => {
    const lines = blockContent.split('\n');
    const firstLine = lines[0];
    const rest = lines.slice(1).join('\n').trim();
    return { firstLine, rest };
  };
  
  const pushHistory = (newContent: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(content);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setContent(newContent);
  };
  
  const handleUndo = () => {
    if (historyIndex >= 0) {
      setContent(history[historyIndex]);
      setHistoryIndex(historyIndex - 1);
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setContent(history[historyIndex + 1]);
    }
  };
  
  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;
  
  const handleContentChange = (newContent: string) => {
    if (content !== newContent) pushHistory(newContent);
  };
  
  const handleAddBlock = (blockContent: string, blockId: string) => {
    pushHistory(blockContent);
    setSentToEditor(blockId);
    setEditorFocused(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const firstLineEnd = blockContent.indexOf('\n');
        const cursorPos = firstLineEnd === -1 ? blockContent.length : firstLineEnd;
        textareaRef.current.setSelectionRange(cursorPos, cursorPos);
      }
    }, 50);
  };
  
  const insertEmoji = (emoji: string) => {
    const newContent = content + emoji;
    pushHistory(newContent);
    textareaRef.current?.focus();
  };
  
  const handleSaveDraft = async () => {
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.createBlock({ action: 'draft', visibility: 'private', content: content.trim() });
      const draft = { id: `draft-${Date.now()}`, title: content.split('\n')[0].slice(0, 20) || 'Untitled', content };
      setDrafts(d => [draft, ...d]);
    } catch (err) {
      console.error('Failed to save draft:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDeleteDraft = (draftId: string) => {
    setDrafts(d => d.filter(draft => draft.id !== draftId));
    setExpandedBlockId(null);
  };
  
  const handlePost = async () => {
    if (!content.trim() || content.length > CHAR_LIMIT || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await api.createBlock({ action: 'post', visibility: status, content: content.trim() });
      onPost({ content: content.trim(), status });
    } catch (err) {
      console.error('Failed to post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const togglePanel = (panel: string) => {
    if (expandedPanel === panel) {
      if (panel !== 'library') setExpandedPanel('library');
    } else {
      setExpandedPanel(panel);
    }
    setExpandedBlockId(null);
    setSearchQuery('');
    if (panel === 'library') setLibraryCategory('trending');
  };
  
  const handleExpandBlock = (blockId: string) => {
    const newId = expandedBlockId === blockId ? null : blockId;
    setExpandedBlockId(newId);
    setSentToEditor(null);
    if (newId) {
      setTimeout(() => {
        if (expandedBlockRef.current) {
          expandedBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };
  
  const charsRemaining = CHAR_LIMIT - content.length;
  const isOverLimit = charsRemaining < 0;
  
  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#18181b' }}>
      {/* Back button */}
      <div className="p-4">
        <button onClick={onClose} className="flex items-center gap-1 text-sm hover:opacity-80 transition-opacity" style={{ color: textColor + '80' }}>
          <Icons.ChevronLeft size={20} />back
        </button>
      </div>
      
      {/* Expandable content area */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 transition-opacity" style={{ opacity: editorFocused ? 0.4 : 1 }}>
        <div className="max-w-md mx-auto w-full flex flex-col h-full">
          
          {/* Builder Guide Panel */}
          <div className={`mb-2 rounded-xl overflow-hidden transition-all flex-shrink-0 ${expandedPanel === 'guide' ? 'flex-1 flex flex-col min-h-0' : ''}`} style={{ backgroundColor: expandedPanel === 'guide' ? textColor + '12' : textColor + '08', border: `1px solid ${expandedPanel === 'guide' ? textColor + '25' : textColor + '15'}` }}>
            <button onClick={() => togglePanel('guide')} className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-white/5 transition-colors flex-shrink-0">
              <div className="text-sm font-medium" style={{ color: textColor }}>Builder Guide</div>
              <div style={{ color: textColor + '40', transform: expandedPanel === 'guide' ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <Icons.ChevronRight size={16} />
              </div>
            </button>
            {expandedPanel === 'guide' && (
              <div className="px-4 pb-4 overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
                <div className="font-mono text-sm space-y-4" style={{ color: textColor }}>
                  <div>
                    <div className="mb-2">TIPS FOR GREAT BIO BLOCKS:</div>
                    <div className="space-y-1" style={{ color: textColor + 'cc' }}>
                      <div>🔥 Use the Trending blocks for quick boosts</div>
                      <div>✂️ Keep it short - 6 lines max works best</div>
                      <div>✨ Use emojis to add personality</div>
                      <div>🔠 Line 1 is generally an ALL CAPS title</div>
                      <div>📋 Lists and rankings are highly remixable</div>
                    </div>
                  </div>
                  <div>
                    <div className="mb-2">PRO TIPS:</div>
                    <div className="space-y-1" style={{ color: textColor + 'cc' }}>
                      <div>🎮 Design game mechanics to boost engagement</div>
                      <div>⬆️ When remixing, try to improve the original</div>
                      <div>🔍 Use search to get inspiration for new ideas</div>
                      <div>💡 If no blocks appear in search, make one!</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Block Library Panel */}
          <div className={`mb-2 rounded-xl overflow-hidden transition-all flex-shrink-0 ${expandedPanel === 'library' ? 'flex-1 flex flex-col min-h-0' : ''}`} style={{ backgroundColor: expandedPanel === 'library' ? textColor + '12' : textColor + '08', border: `1px solid ${expandedPanel === 'library' ? textColor + '25' : textColor + '15'}` }}>
            <button onClick={() => togglePanel('library')} className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-white/5 transition-colors flex-shrink-0">
              <div className="text-sm font-medium" style={{ color: textColor }}>Block Library</div>
              <div style={{ color: textColor + '40', transform: expandedPanel === 'library' ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <Icons.ChevronRight size={16} />
              </div>
            </button>
            {expandedPanel === 'library' && (
              <div className="px-4 pb-4 flex flex-col flex-1 min-h-0">
                {/* Search */}
                <div className="relative mb-3 flex-shrink-0">
                  <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: searchFocused ? textColor + '80' : textColor + '40' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => { setSearchFocused(true); setLibraryCategory(null); }}
                    onBlur={() => setSearchFocused(false)}
                    placeholder="Search..."
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{ backgroundColor: searchFocused ? '#0f0f12' : 'transparent', color: textColor, border: searchFocused ? `1px solid ${textColor}30` : '1px solid rgba(255,255,255,0.1)' }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80" style={{ color: textColor + '60' }}>
                      <Icons.X size={14} />
                    </button>
                  )}
                </div>
                
                {/* Search focused - show recent & popular */}
                {searchFocused && !searchQuery && (
                  <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                    {recentSearches.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium" style={{ color: textColor + '60' }}>Recent</span>
                          <button onMouseDown={(e) => e.preventDefault()} onClick={() => setRecentSearches([])} className="text-xs hover:opacity-80" style={{ color: textColor + '40' }}>Clear</button>
                        </div>
                        {recentSearches.map((term, i) => (
                          <button key={i} onMouseDown={(e) => e.preventDefault()} onClick={() => setSearchQuery(term)} className="w-full px-3 py-2.5 text-left flex items-center justify-between transition-colors rounded-lg hover:bg-white/5">
                            <div className="flex items-center gap-3">
                              <span style={{ color: textColor + '40' }}>🕐</span>
                              <span className="text-sm" style={{ color: textColor + 'cc' }}>{term}</span>
                            </div>
                            <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setRecentSearches(r => r.filter((_, idx) => idx !== i)); }} className="hover:opacity-80" style={{ color: textColor + '40' }}>
                              <Icons.X size={14} />
                            </button>
                          </button>
                        ))}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium" style={{ color: textColor + '60' }}>Popular</span>
                      </div>
                      {['boyfriend list', 'spotify wrapped', 'hot takes', 'skill tree', 'comfort movies', 'vibe check'].map((term, i) => (
                        <button key={i} onMouseDown={(e) => e.preventDefault()} onClick={() => setSearchQuery(term)} className="w-full px-3 py-2.5 text-left flex items-center gap-3 transition-colors rounded-lg hover:bg-white/5">
                          <span style={{ color: i < 2 ? '#ef4444' : textColor + '40' }}>◉</span>
                          <span className="text-sm" style={{ color: textColor + 'cc' }}>{term}</span>
                          {i < 3 && <span className="text-xs" style={{ color: textColor + '40' }}>🔥 Trending</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Categories */}
                {!searchFocused && !searchQuery && (
                  <div className="flex gap-2 mb-3 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
                    {BLOCK_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setLibraryCategory(cat.id); setExpandedBlockId(null); }}
                        className="px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 whitespace-nowrap transition-all active:scale-95"
                        style={{
                          backgroundColor: libraryCategory === cat.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                          color: libraryCategory === cat.id ? '#fff' : 'rgba(255,255,255,0.5)',
                          border: libraryCategory === cat.id ? '1px solid transparent' : '1px solid rgba(255,255,255,0.2)',
                        }}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}{cat.id === 'drafts' && drafts.length > 0 ? ` (${drafts.length})` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Block list */}
                {(!searchFocused || searchQuery) && (
                  <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
                    {filteredLibraryBlocks.map((b: any, index: number) => {
                      const isExpanded = expandedBlockId === b.id;
                      const { firstLine, rest } = getBlockParts(b.content);
                      const isDimmed = expandedBlockId && !isExpanded;
                      const isLast = index === filteredLibraryBlocks.length - 1;
                      const isSent = sentToEditor === b.id;
                      
                      if (isExpanded) {
                        return (
                          <div key={b.id} ref={expandedBlockRef} className="my-1 rounded-xl overflow-hidden" style={{ backgroundColor: '#3f3f46' }}>
                            <button onClick={() => handleExpandBlock(b.id)} className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-white/5 transition-colors active:bg-white/10">
                              <span className="font-mono text-sm" style={{ color: textColor }}>{firstLine}</span>
                              {b.remixes && <span className="text-xs flex items-center gap-1" style={{ color: textColor + '50' }}><Icons.Remix size={12} />{b.remixes}</span>}
                            </button>
                            <div className="px-4 pb-4">
                              {rest && <div className="font-mono text-sm whitespace-pre-wrap mb-4 -mt-1" style={{ color: textColor }}>{rest}</div>}
                              {isSent ? (
                                <div className="w-full py-3 text-sm font-medium flex items-center justify-center gap-2" style={{ color: '#22c55e' }}>
                                  <Icons.Check size={16} />Sent to editor
                                </div>
                              ) : libraryCategory === 'drafts' ? (
                                <div className="flex gap-2">
                                  <button onClick={() => handleDeleteDraft(b.id)} className="flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: '#ef4444', color: '#fff' }}>
                                    <Icons.X size={16} />Delete
                                  </button>
                                  <button onClick={() => handleAddBlock(b.content, b.id)} className="flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: '#3b82f6', color: '#fff' }}>
                                    <Icons.Remix size={16} />Edit
                                  </button>
                                </div>
                              ) : (b as any).app && !connectedApps.includes((b as any).app) ? (
                                <button onClick={() => setConnectedApps(apps => [...apps, (b as any).app])} className="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: APP_CATEGORIES.find(a => a.id === (b as any).app)?.color || '#3b82f6', color: '#fff' }}>
                                  <Icons.Link size={16} />Connect {APP_CATEGORIES.find(a => a.id === (b as any).app)?.name}
                                </button>
                              ) : (
                                <button onClick={() => handleAddBlock(b.content, b.id)} className="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: '#3b82f6', color: '#fff' }}>
                                  <Icons.Remix size={16} />Remix
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <button key={b.id} onClick={() => handleExpandBlock(b.id)} className="w-full px-4 py-3 text-left flex items-center justify-between transition-colors active:bg-white/10 hover:bg-white/5" style={{ borderBottom: !isLast ? '1px solid rgba(255,255,255,0.08)' : 'none', opacity: isDimmed ? 0.5 : 1 }}>
                          <span className="font-mono text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.8)' }}>{firstLine}</span>
                          {b.remixes && <span className="text-xs flex items-center gap-1" style={{ color: textColor + '50' }}><Icons.Remix size={12} />{b.remixes}</span>}
                        </button>
                      );
                    })}
                    {filteredLibraryBlocks.length === 0 && (
                      <div className="text-center py-6 text-sm" style={{ color: textColor + '50' }}>
                        {libraryCategory === 'drafts' ? 'No drafts yet' : 'No blocks found'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Fixed bottom section - editor + controls */}
      <div className="flex-shrink-0 px-4 pb-4" style={{ backgroundColor: '#18181b' }}>
        <div className="max-w-md mx-auto">
          {/* Editor */}
          <div className="rounded-xl p-4 mb-2 transition-all" style={{ background: blockBg, minHeight: '144px', boxShadow: editorFocused ? '0 0 0 2px rgba(255,255,255,0.2)' : 'none' }}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onFocus={() => setEditorFocused(true)}
              onBlur={() => setEditorFocused(false)}
              placeholder="add some content..."
              className="w-full bg-transparent font-mono text-sm resize-none outline-none"
              style={{ color: textColor, height: '120px' }}
            />
          </div>
          
          {/* Undo/Redo + char count */}
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex gap-1">
              <button onClick={handleUndo} disabled={!canUndo} className="p-1.5 rounded hover:bg-white/10 transition-colors" style={{ color: canUndo ? textColor : textColor + '30' }}>
                <Icons.Undo size={16} />
              </button>
              <button onClick={handleRedo} disabled={!canRedo} className="p-1.5 rounded hover:bg-white/10 transition-colors" style={{ color: canRedo ? textColor : textColor + '30' }}>
                <Icons.Redo size={16} />
              </button>
            </div>
            <span className="text-xs" style={{ color: isOverLimit ? '#ff6b6b' : textColor + '50' }}>{content.length}/{CHAR_LIMIT}</span>
          </div>
          
          {/* Smart emojis */}
          <div className="h-10 mb-3 flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {contentEmojis.map((emoji, i) => (
              <button key={i} onClick={() => insertEmoji(emoji)} className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 hover:scale-110 active:scale-95 transition-transform" style={{ backgroundColor: textColor + '20' }}>
                {emoji}
              </button>
            ))}
          </div>
          
          {/* Bottom bar */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[
                { id: 'pinned' as const, icon: Icons.Pin },
                { id: 'public' as const, icon: Icons.Globe },
                { id: 'private' as const, icon: Icons.Lock },
              ].map(o => (
                <button key={o.id} onClick={() => setStatus(o.id)} className="p-2 rounded transition-all hover:bg-white/10 active:scale-95" style={{ backgroundColor: status === o.id ? textColor + '25' : 'transparent', color: status === o.id ? textColor : textColor + '40' }}>
                  <o.icon size={16} />
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <button onClick={handleSaveDraft} disabled={!content.trim() || isSubmitting} className="px-5 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]" style={{ backgroundColor: textColor + '15', color: content.trim() && !isSubmitting ? textColor : textColor + '40' }}>
              {isSubmitting ? '...' : 'Save Draft'}
            </button>
            <button onClick={handlePost} disabled={!content.trim() || isOverLimit || isSubmitting} className="px-6 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]" style={{ backgroundColor: (content.trim() && !isOverLimit && !isSubmitting) ? '#3b82f6' : '#3b82f640', color: '#fff' }}>
              {isSubmitting ? '...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

const BigBio = () => {
  const [activeView, setActiveView] = useState('bio');
  const [activeTab, setActiveTab] = useState('pinned');
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  
  const [profile, setProfile] = useState<any>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [stylePresets] = useState(STYLE_PRESETS);
  const [userStyle, setUserStyle] = useState({ preset: 'midnight', customColors: null, customTextColor: null, pattern: 'none', angle: 135 });
  
  const [pulsingTab, setPulsingTab] = useState<string | null>(null);
  const tabRefs = { pinned: useRef<HTMLButtonElement>(null), public: useRef<HTMLButtonElement>(null), private: useRef<HTMLButtonElement>(null) };
  const [draggedBlockId, setDraggedBlockId] = useState<any>(null);

  const currentHandle = 'nightowl';
  const currentStyle = ThemeUtils.getStyleFromSettings(userStyle, stylePresets);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, blocksData, feedData] = await Promise.all([
        api.getProfile(currentHandle).catch(() => null),
        api.getPinnedBlocks(currentHandle).catch(() => ({ items: [] })),
        api.getFeed(20).catch(() => ({ items: [] })),
      ]);
      setProfile(profileData);
      setBlocks(blocksData.items || []);
      setFeedPosts(feedData.items || []);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBlocksForTab(); }, [activeTab]);

  const loadBlocksForTab = async () => {
    try {
      let data;
      switch (activeTab) {
        case 'pinned': data = await api.getPinnedBlocks(currentHandle); break;
        case 'public': data = await api.getPublicBlocks(currentHandle); break;
        case 'private': data = await api.getPrivateBlocks(currentHandle); break;
        default: data = { items: [] };
      }
      setBlocks(data.items || []);
    } catch (err) { console.error('Failed to load blocks for tab:', err); }
  };

  const handlePostBlock = async () => {
    await loadBlocksForTab();
    setShowCreate(false);
  };

  const handleStatusChange = (blockId: string, newStatus: string) => {
    setPulsingTab(newStatus);
    setTimeout(() => setPulsingTab(null), 400);
    console.log('Status change:', blockId, '->', newStatus);
  };

  const handleDragStart = (blockId: any) => setDraggedBlockId(blockId);
  const handleDragEnd = () => setDraggedBlockId(null);
  const handleDragOver = (e: any, targetBlockId: any) => { e.preventDefault(); };

  const tabSegments = [
    { id: 'pinned', label: 'Pinned', icon: <Icons.Pin size={12} /> },
    { id: 'public', label: 'Public', icon: <Icons.Globe size={12} /> },
    { id: 'private', label: 'Private', icon: <Icons.Lock size={12} /> },
  ];

  const tabCounts = { pinned: blocks.filter(b => b.is_pinned).length || blocks.length, public: 0, private: 0 };
  const totalLikes = profile?.total_likes || blocks.reduce((sum, b) => sum + (b.like_count || 0), 0);

  // Show Create View
  if (showCreate) {
    return <CreateView userStyle={userStyle} onClose={() => setShowCreate(false)} onPost={handlePostBlock} />;
  }

  const BioView = () => (
    <div className="min-h-screen pb-24 relative" style={{ background: ThemeUtils.generateBackground(userStyle, stylePresets) }}>
      <div className="absolute inset-0 pointer-events-none" style={ThemeUtils.getPatternStyle(userStyle, currentStyle.textColor)} />
      <div className="max-w-md mx-auto relative z-10 p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar emoji="🌙" size="lg" className="border-2" style={{ borderColor: currentStyle.textColor + '40' }} />
          <div className="flex-1">
            <div className="font-medium" style={{ color: currentStyle.textColor }}>@{currentHandle}</div>
            <div className="text-sm" style={{ color: currentStyle.textColor + '80' }}>{totalLikes} likes</div>
          </div>
          <button onClick={() => setShowStylePicker(true)} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur flex items-center justify-center hover:bg-black/30 transition-colors" style={{ color: currentStyle.textColor }}>🎨</button>
          <button onClick={() => setShowCreate(true)} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur flex items-center justify-center hover:bg-black/30 transition-colors" style={{ color: currentStyle.textColor }}>+</button>
        </div>
        <div className="mb-6">
          <SegmentedControl segments={tabSegments} activeSegment={activeTab} onSegmentChange={setActiveTab} textColor={currentStyle.textColor} counts={tabCounts} refs={tabRefs} pulsingSegment={pulsingTab} />
        </div>
        {loading ? <LoadingState textColor={currentStyle.textColor} /> : error ? <ErrorState message={error} textColor={currentStyle.textColor} onRetry={loadData} /> : blocks.length === 0 ? (
          <EmptyState icon={{ pinned: '📌', public: '🌍', private: '🔒' }[activeTab]} message={`No ${activeTab} blocks yet`} textColor={currentStyle.textColor} />
        ) : (
          <div>
            {blocks.map(block => (
              <MinimalBlock key={block.id} block={block} style={currentStyle} onTap={setSelectedBlock} onStatusChange={handleStatusChange} isDraggable={activeTab === 'pinned'} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} />
            ))}
          </div>
        )}
      </div>
      {selectedBlock && <ModalBlock block={selectedBlock} style={currentStyle} onClose={() => setSelectedBlock(null)} />}
      <StylePicker isOpen={showStylePicker} onClose={() => setShowStylePicker(false)} currentStyle={userStyle} onStyleChange={setUserStyle} presets={stylePresets} />
      <TabBar activeTab={activeView} onTabChange={setActiveView} tabs={[{ id: 'bio', label: 'bio' }, { id: 'feed', label: 'feed' }]} />
    </div>
  );

  const FeedView = () => (
    <div className="min-h-screen bg-black pb-24">
      <div className="max-w-md mx-auto p-6 space-y-4">
        <h2 className="text-white/60 text-xs uppercase tracking-wider mb-6">discover</h2>
        {loading ? <LoadingState textColor="#ffffff" /> : feedPosts.length === 0 ? <EmptyState icon="📭" message="No posts in feed yet" textColor="#ffffff" /> : (
          feedPosts.map(post => <FeedBlock key={post.id} block={post} style={{ textColor: '#ffffff' }} onTap={setSelectedBlock} />)
        )}
      </div>
      {selectedBlock && <ModalBlock block={selectedBlock} style={{ textColor: '#ffffff' }} onClose={() => setSelectedBlock(null)} />}
      <TabBar activeTab={activeView} onTabChange={setActiveView} tabs={[{ id: 'bio', label: 'bio' }, { id: 'feed', label: 'feed' }]} />
    </div>
  );

  return activeView === 'bio' ? <BioView /> : <FeedView />;
};

export default BigBio;