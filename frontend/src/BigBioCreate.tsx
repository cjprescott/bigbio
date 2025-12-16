import React, { useState, useRef, useMemo, useEffect } from 'react';
import { api } from './api';

// ============================================================================
// THEME SYSTEM
// ============================================================================

const STYLE_PRESETS = [
  { id: 'midnight', name: 'Midnight', colors: ['#0f0c29', '#302b63', '#24243e'], textColor: '#ffffff' },
  { id: 'cosmic', name: 'Cosmic', colors: ['#0f0f23', '#1a1a3e', '#2d1b4e'], textColor: '#ff9ff3' },
  { id: 'fire', name: 'Fire', colors: ['#8b0000', '#cc2200', '#ff4500'], textColor: '#ffffff' },
  { id: 'blush', name: 'Blush', colors: ['#fff5f5', '#ffe8e8', '#ffdada'], textColor: '#4a2c2c' },
  { id: 'ocean', name: 'Ocean', colors: ['#003366', '#004488', '#0055aa'], textColor: '#b3e0ff' },
];

const ThemeUtils = {
  getStyleFromSettings: (settings, presets = STYLE_PRESETS) => {
    const preset = presets.find(p => p.id === settings.preset);
    return { colors: preset?.colors || ['#000', '#333'], textColor: preset?.textColor || '#ffffff' };
  },
  generateBackground: (settings, presets = STYLE_PRESETS) => {
    const { colors } = ThemeUtils.getStyleFromSettings(settings, presets);
    return `linear-gradient(${settings.angle || 135}deg, ${colors.join(', ')})`;
  },
};

// ============================================================================
// BLOCK LIBRARY
// ============================================================================

const BLOCK_LIBRARY = [
  { id: 't01', title: 'BOYFRIEND LIST', content: 'BOYFRIEND LIST\n💀 Jake\n💀 Marcus\n💀 Tyler\n❤️ Noah', remixes: 456, category: 'lists' },
  { id: 't02', title: 'ALBUMS ON REPEAT', content: 'ALBUMS ON REPEAT 🎵\n\n1. Brat\n2. SOS\n3. GUTS\n4. Eternal Sunshine', remixes: 234, category: 'lists' },
  { id: 't20', title: 'BIO BASICS', content: 'she/her ⚡\n19 ♡ pisces ♓\nlondon 🌧️', remixes: 1234, category: 'identity' },
  { id: 't21', title: 'PERSONA', content: '👑 main character energy\n🖤 chaos coordinator\n✨ professional overthinker', remixes: 567, category: 'identity' },
];

const BLOCK_CATEGORIES = [
  { id: 'drafts', name: 'Drafts', icon: '📝' },
  { id: 'trending', name: 'Trending', icon: '🔥' },
  { id: 'lists', name: 'Lists', icon: '📋' },
  { id: 'identity', name: 'Identity', icon: '🪞' },
];

const CHAR_LIMIT = 180;
const DEFAULT_EMOJIS = ['✨', '🌙', '💫', '🖤', '🤍', '♡', '⚡', '🔥', '💀', '😭', '👑', '·'];

const extractEmojis = (text) => {
  if (!text) return [];
  const matches = text.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[◐◯⭐♡✅❌🟩🟥📈📉💰☀️🌙🛰️☄️⚡]/gu) || [];
  return [...new Set(matches)].slice(0, 12);
};

// ============================================================================
// ICONS
// ============================================================================

const ChevronLeft = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>;
const ChevronRight = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>;
const Search = ({ size = 16, className, style }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} style={style}><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
const X = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>;
const Remix = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>;
const Pin = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></svg>;
const Globe = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
const Lock = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
const Undo = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6" /><path d="M3 13a9 9 0 1 0 3-7.7L3 7" /></svg>;
const Redo = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6" /><path d="M21 13a9 9 0 1 1-3-7.7L21 7" /></svg>;
const Check = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>;

// ============================================================================
// CREATE VIEW
// ============================================================================

export default function BigBioCreate({ userId = '8fa2ddf7-c6e9-4ee1-a2e2-b171edd92bef', onClose }) {
  const [content, setContent] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [status, setStatus] = useState('public');
  const [expandedPanel, setExpandedPanel] = useState('library');
  const [libraryCategory, setLibraryCategory] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBlockId, setExpandedBlockId] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);
  const [sentToEditor, setSentToEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  
  const textareaRef = useRef(null);
  const expandedBlockRef = useRef(null);
  
  const userStyle = { preset: 'midnight', angle: 135 };
  const currentStyle = ThemeUtils.getStyleFromSettings(userStyle, STYLE_PRESETS);
  const textColor = currentStyle.textColor;
  const blockBg = ThemeUtils.generateBackground(userStyle, STYLE_PRESETS);
  
  const contentEmojis = useMemo(() => extractEmojis(content), [content]);
  
  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      const draftBlocks = await api.getDrafts('nightowl', userId);
      setDrafts(draftBlocks.map(d => ({
        id: d.id,
        title: d.title || d.content.split('\n')[0].slice(0, 20) || 'Untitled',
        content: d.content
      })));
    } catch (err) {
      console.error('Failed to load drafts:', err);
    }
  };

  const filteredLibraryBlocks = useMemo(() => {
    if (libraryCategory === 'drafts') return drafts;
    let blocks = BLOCK_LIBRARY;
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
  
  const getBlockParts = (content) => {
    const lines = content.split('\n');
    const firstLine = lines[0];
    const rest = lines.slice(1).join('\n').trim();
    return { firstLine, rest };
  };
  
  const pushHistory = (newContent) => {
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
  
  const handleContentChange = (newContent) => {
    if (content !== newContent) {
      pushHistory(newContent);
    }
  };
  
  const handleAddBlock = (blockContent, blockId) => {
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
  
  const insertEmoji = (emoji) => {
    const newContent = content + emoji;
    pushHistory(newContent);
    textareaRef.current?.focus();
  };
  
  const handleSaveDraft = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      await api.createBlock({
        ownerId: userId,
        action: 'draft',
        content: content.trim(),
        visibility: status,
      });
      await loadDrafts();
      setContent('');
      setHistory([]);
      setHistoryIndex(-1);
    } catch (err) {
      console.error('Failed to save draft:', err);
      alert('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteDraft = async (draftId) => {
    // TODO: Implement delete draft endpoint
    setDrafts(d => d.filter(draft => draft.id !== draftId));
    setExpandedBlockId(null);
  };
  
  const handlePost = async () => {
    if (!content.trim() || content.length > CHAR_LIMIT || posting) return;
    setPosting(true);
    try {
      await api.createBlock({
        ownerId: userId,
        action: 'post',
        content: content.trim(),
        visibility: status,
      });
      setContent('');
      setHistory([]);
      setHistoryIndex(-1);
      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to post block:', err);
      alert('Failed to post block');
    } finally {
      setPosting(false);
    }
  };
  
  const togglePanel = (panel) => {
    if (expandedPanel === panel) {
      if (panel !== 'library') {
        setExpandedPanel('library');
      }
    } else {
      setExpandedPanel(panel);
    }
    setExpandedBlockId(null);
    setSearchQuery('');
    if (panel === 'library') {
      setLibraryCategory('trending');
    }
  };
  
  const handleExpandBlock = (blockId) => {
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
      <div className="p-4">
        <button onClick={onClose} className="flex items-center gap-1 text-sm hover:opacity-80 transition-opacity" style={{ color: textColor + '80' }}>
          <ChevronLeft size={20} />back
        </button>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col px-4 transition-opacity" style={{ opacity: editorFocused ? 0.4 : 1 }}>
        <div className="max-w-md mx-auto w-full flex flex-col h-full">
          
          <div className={`mb-2 rounded-xl overflow-hidden transition-all flex-shrink-0 ${expandedPanel === 'library' ? 'flex-1 flex flex-col min-h-0' : ''}`} style={{ backgroundColor: expandedPanel === 'library' ? textColor + '12' : textColor + '08', border: `1px solid ${expandedPanel === 'library' ? textColor + '25' : textColor + '15'}` }}>
            <button onClick={() => togglePanel('library')} className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-white/5 transition-colors flex-shrink-0">
              <div className="text-sm font-medium" style={{ color: textColor }}>Block Library</div>
              <div style={{ color: textColor + '40', transform: expandedPanel === 'library' ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <ChevronRight size={16} />
              </div>
            </button>
            {expandedPanel === 'library' && (
              <div className="px-4 pb-4 flex flex-col flex-1 min-h-0">
                <div className="relative mb-3 flex-shrink-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: searchFocused ? textColor + '80' : textColor + '40' }} />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => { setSearchFocused(true); setLibraryCategory(null); }} onBlur={() => setSearchFocused(false)} placeholder="Search..." className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm outline-none transition-all" style={{ backgroundColor: searchFocused ? '#0f0f12' : 'transparent', color: textColor, border: searchFocused ? `1px solid ${textColor}30` : '1px solid rgba(255,255,255,0.1)' }} />
                  {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-80" style={{ color: textColor + '60' }}><X size={14} /></button>}
                </div>
                
                {!searchFocused && !searchQuery && (
                  <div className="flex gap-2 mb-3 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
                    {BLOCK_CATEGORIES.map(cat => (
                      <button key={cat.id} onClick={() => { setLibraryCategory(cat.id); setExpandedBlockId(null); }} className="px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 whitespace-nowrap transition-all active:scale-95" style={{ backgroundColor: libraryCategory === cat.id ? 'rgba(255,255,255,0.15)' : 'transparent', color: libraryCategory === cat.id ? '#fff' : 'rgba(255,255,255,0.5)', border: libraryCategory === cat.id ? '1px solid transparent' : '1px solid rgba(255,255,255,0.2)' }}>
                        <span>{cat.icon}</span><span>{cat.name}{cat.id === 'drafts' && drafts.length > 0 ? ` (${drafts.length})` : ''}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {(!searchFocused || searchQuery) && (
                  <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
                    {filteredLibraryBlocks.map((b, index) => {
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
                              {b.remixes && <span className="text-xs flex items-center gap-1" style={{ color: textColor + '50' }}><Remix size={12} />{b.remixes}</span>}
                            </button>
                            <div className="px-4 pb-4">
                              {rest && <div className="font-mono text-sm whitespace-pre-wrap mb-4 -mt-1" style={{ color: textColor }}>{rest}</div>}
                              {isSent ? (
                                <div className="w-full py-3 text-sm font-medium flex items-center justify-center gap-2" style={{ color: '#22c55e' }}><Check size={16} />Sent to editor</div>
                              ) : libraryCategory === 'drafts' ? (
                                <div className="flex gap-2">
                                  <button onClick={() => handleDeleteDraft(b.id)} className="flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: '#ef4444', color: '#fff' }}><X size={16} />Delete</button>
                                  <button onClick={() => handleAddBlock(b.content, b.id)} className="flex-1 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: '#3b82f6', color: '#fff' }}><Remix size={16} />Edit</button>
                                </div>
                              ) : (
                                <button onClick={() => handleAddBlock(b.content, b.id)} className="w-full py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2" style={{ backgroundColor: '#3b82f6', color: '#fff' }}><Remix size={16} />Remix</button>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <button key={b.id} onClick={() => handleExpandBlock(b.id)} className="w-full px-4 py-3 text-left flex items-center justify-between transition-colors active:bg-white/10" style={{ borderBottom: !isLast ? '1px solid rgba(255,255,255,0.08)' : 'none', opacity: isDimmed ? 0.5 : 1 }}>
                          <span className="font-mono text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.8)' }}>{firstLine}</span>
                          {b.remixes && <span className="text-xs flex items-center gap-1" style={{ color: textColor + '50' }}><Remix size={12} />{b.remixes}</span>}
                        </button>
                      );
                    })}
                    {filteredLibraryBlocks.length === 0 && <div className="text-center py-6 text-sm" style={{ color: textColor + '50' }}>{libraryCategory === 'drafts' ? 'No drafts yet' : 'No blocks found'}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
          
        </div>
      </div>
      
      <div className="flex-shrink-0 px-4 pb-4" style={{ backgroundColor: '#18181b' }}>
        <div className="max-w-md mx-auto">
          <div className="rounded-xl p-4 mb-2 transition-all" style={{ background: blockBg, minHeight: '144px', boxShadow: editorFocused ? '0 0 0 2px rgba(255,255,255,0.2)' : 'none' }}>
            <textarea ref={textareaRef} value={content} onChange={(e) => handleContentChange(e.target.value)} onFocus={() => setEditorFocused(true)} onBlur={() => setEditorFocused(false)} placeholder="add some content..." className="w-full bg-transparent font-mono text-sm resize-none outline-none" style={{ color: textColor, height: '120px' }} />
          </div>
          
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex gap-1">
              <button onClick={handleUndo} disabled={!canUndo} className="p-1.5 rounded hover:bg-white/10 transition-colors" style={{ color: canUndo ? textColor : textColor + '30' }}><Undo size={16} /></button>
              <button onClick={handleRedo} disabled={!canRedo} className="p-1.5 rounded hover:bg-white/10 transition-colors" style={{ color: canRedo ? textColor : textColor + '30' }}><Redo size={16} /></button>
            </div>
            <span className="text-xs" style={{ color: isOverLimit ? '#ff6b6b' : textColor + '50' }}>{content.length}/{CHAR_LIMIT}</span>
          </div>
          
          <div className="h-10 mb-3 flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {contentEmojis.length > 0 ? contentEmojis.map((emoji, i) => (
              <button key={i} onClick={() => insertEmoji(emoji)} className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 hover:scale-110 active:scale-95 transition-transform" style={{ backgroundColor: textColor + '20' }}>{emoji}</button>
            )) : DEFAULT_EMOJIS.map((emoji, i) => (
              <button key={i} onClick={() => insertEmoji(emoji)} className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 hover:scale-110 active:scale-95 transition-transform" style={{ backgroundColor: textColor + '20' }}>{emoji}</button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[{ id: 'pinned', icon: Pin }, { id: 'public', icon: Globe }, { id: 'private', icon: Lock }].map(o => (
                <button key={o.id} onClick={() => setStatus(o.id)} className="p-2 rounded transition-all hover:bg-white/10 active:scale-95" style={{ backgroundColor: status === o.id ? textColor + '25' : 'transparent', color: status === o.id ? textColor : textColor + '40' }}><o.icon size={16} /></button>
              ))}
            </div>
            <div className="flex-1" />
            <button onClick={handleSaveDraft} disabled={!content.trim() || saving} className="px-5 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]" style={{ backgroundColor: textColor + '15', color: content.trim() ? textColor : textColor + '40' }}>
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button onClick={handlePost} disabled={!content.trim() || isOverLimit || posting} className="px-6 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 active:scale-[0.98]" style={{ backgroundColor: (content.trim() && !isOverLimit) ? '#3b82f6' : '#3b82f640', color: '#fff' }}>
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}