const RULES: Array<{ tag: string; re: RegExp }> = [
  { tag: "friends", re: /\bfriends?\b/i },
  { tag: "relationships", re: /\bboyfriend|girlfriend|crush|dating|relationship\b/i },
  { tag: "music", re: /\bspotify|song|tracks?|album|artist\b/i },
  { tag: "games", re: /\bfortnite|rank|elo|maps?\b/i },
  { tag: "lists", re: /\btop\s*\{?\d+?\}?|^\s*\{idx\}/im },
  { tag: "prompt", re: /\bremix\b|\bcomment\b|\btag\b/i },
];

export function suggestTagsFromContent(content: string): string[] {
  const found = new Set<string>();
  for (const r of RULES) if (r.re.test(content)) found.add(r.tag);
  return Array.from(found).slice(0, 8);
}
