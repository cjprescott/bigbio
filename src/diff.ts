export type DiffOp =
  | { op: "replace"; line: number; old: string; new: string }
  | { op: "insert"; line: number; value: string }
  | { op: "delete"; line: number; old: string };

function normalize(s: string): string[] {
  return s.replace(/\r\n/g, "\n").split("\n");
}

// Simple line-based diff good for small blocks.
// Not a full LCS, but predictable and useful for analytics.
export function diffLines(parentText: string, childText: string): DiffOp[] {
  const a = normalize(parentText);
  const b = normalize(childText);

  const ops: DiffOp[] = [];
  const max = Math.max(a.length, b.length);

  for (let i = 0; i < max; i++) {
    const oldLine = a[i];
    const newLine = b[i];

    if (oldLine === undefined && newLine !== undefined) {
      ops.push({ op: "insert", line: i, value: newLine });
    } else if (oldLine !== undefined && newLine === undefined) {
      ops.push({ op: "delete", line: i, old: oldLine });
    } else if (oldLine !== newLine) {
      ops.push({ op: "replace", line: i, old: oldLine ?? "", new: newLine ?? "" });
    }
  }
  return ops;
}
