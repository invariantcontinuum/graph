const assert = require("assert");

function measureText(text) {
    return { width: text.length * 10 };
}

function fitCharsOld(
  ctx,
  chars,
  start,
  maxWidth,
) {
  let best = start;
  let chunk = "";
  for (let i = start; i < chars.length; i++) {
    chunk += chars[i];
    if (ctx.measureText(chunk).width > maxWidth) break;
    best = i + 1;
  }
  return best;
}


function fitCharsNew(
  ctx,
  chars,
  start,
  maxWidth,
) {
  let lo = start;
  let hi = chars.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    let chunk = "";
    for (let i = start; i < mid; i++) chunk += chars[i];
    if (ctx.measureText(chunk).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

const ctx = { measureText };
const chars = "hello world".split("");

const testCases = [
  {start: 0, maxWidth: 5}, // 0
  {start: 0, maxWidth: 10}, // 1
  {start: 0, maxWidth: 15}, // 1
  {start: 0, maxWidth: 20}, // 2
  {start: 0, maxWidth: 50}, // 5
  {start: 0, maxWidth: 110}, // 11
  {start: 0, maxWidth: 200}, // 11
  {start: 5, maxWidth: 10}, // 6
  {start: 11, maxWidth: 10}, // 11
];

for (const t of testCases) {
    const expected = fitCharsOld(ctx, chars, t.start, t.maxWidth);
    const actual = fitCharsNew(ctx, chars, t.start, t.maxWidth);
    if (expected !== actual) {
        console.error(`Mismatch for start=${t.start}, maxWidth=${t.maxWidth}: expected ${expected}, got ${actual}`);
    } else {
        console.log(`OK: start=${t.start}, maxWidth=${t.maxWidth} -> ${actual}`);
    }
}
