import crypto from "crypto";

export type SkeletonResult = {
  skeletonText: string;
  skeletonSig: string;
  slotCount: number;
  lineCount: number;
};

function normalizeWhitespace(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Very pragmatic v1 heuristics.
// Goal: treat "forms" as same template even if values differ.
function skeletonizeLine(line: string): { out: string; slots: number } {
  let out = line.trim();
  let slots = 0;

  // URLs
  if (/\bhttps?:\/\/\S+/i.test(out)) {
    out = out.replace(/\bhttps?:\/\/\S+/gi, "{url}");
    slots++;
  }

  // Mentions/handles
  if (/@[a-z0-9_]{2,}/i.test(out)) {
    out = out.replace(/@[a-z0-9_]{2,}/gi, "{handle}");
    slots++;
  }

  // Leading bullets / numbering (keeps structure)
  // Examples: "1. Anne", "2) Brian", "- Chris", "• Dave"
  out = out.replace(/^(\s*)(\d{1,3})([.)])(\s*)/, "$1{idx}$3$4");
  out = out.replace(/^(\s*)([-*•])(\s*)/, "$1{bullet}$3");

  // Replace obvious numbers/dates inside line (not the idx marker)
  // Keep small counts like "Top 3" as structure too.
  out = out.replace(/\b\d{1,4}\b/g, "{num}");

  // Replace likely "value tokens" after ":" or after idx/bullet patterns
  // e.g. "{idx}. Anne" -> "{idx}. {value}"
  out = out.replace(/(\{idx\}[.)]\s*)(.+)$/i, (_m, p1) => {
    slots++;
    return `${p1}{value}`;
  });
  out = out.replace(/(\{bullet\}\s*)(.+)$/i, (_m, p1) => {
    slots++;
    return `${p1}{value}`;
  });

  // Replace common "Label: value" patterns
  out = out.replace(/^(.{2,30}:\s*)(.+)$/i, (_m, p1) => {
    slots++;
    return `${p1}{value}`;
  });

  // Normalize multiple placeholders
  out = out.replace(/\{num\}\s*\{num\}/g, "{num}");

  return { out, slots };
}

export function buildSkeleton(raw: string): SkeletonResult {
  const normalized = normalizeWhitespace(raw);
  const lines = normalized.split("\n").map((l) => l.trimEnd());
  const nonEmpty = lines.filter((l) => l.trim().length > 0);

  let slotCount = 0;

  const skeletonLines = nonEmpty.map((line, idx) => {
    // Title line: keep as-is but normalize spacing/case a bit
    if (idx === 0) {
      return line.toUpperCase();
    }
    const res = skeletonizeLine(line);
    slotCount += res.slots;
    return res.out;
  });

  const skeletonText = skeletonLines.join("\n").trim();
  const skeletonSig = crypto.createHash("sha256").update(skeletonText, "utf8").digest("hex");

  return {
    skeletonText,
    skeletonSig,
    slotCount,
    lineCount: skeletonLines.length
  };
}
