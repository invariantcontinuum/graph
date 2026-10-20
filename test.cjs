const chars = ['a', 'b', 'c', 'd', 'e'];
const maxWidth = 3;
const ctx = {
  measureText: (chunk) => ({ width: chunk.length })
};

function fitCharsOld(ctx, chars, start, maxWidth) {
  let best = start;
  let chunk = "";
  for (let i = start; i < chars.length; i++) {
    chunk += chars[i];
    if (ctx.measureText(chunk).width > maxWidth) break;
    best = i + 1;
  }
  return best;
}

function fitCharsNew(ctx, chars, start, maxWidth) {
  let lo = start;
  let hi = chars.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    let chunk = "";
    for (let i = start; i < mid; i++) chunk += chars[i];
    if (ctx.measureText(chunk).width <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

for (let s = 0; s <= chars.length; s++) {
  for (let w = 0; w <= 10; w++) {
    const r1 = fitCharsOld(ctx, chars, s, w);
    const r2 = fitCharsNew(ctx, chars, s, w);
    if (r1 !== r2) {
      console.log(`Failed at s=${s}, w=${w}: old=${r1}, new=${r2}`);
    }
  }
}
console.log("Done");
