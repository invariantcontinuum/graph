const assert = require("assert");

function measureText(text) {
    return { width: text.length * 10 };
}

function fitChars(
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
// width of "hello " is 60, "hello" is 50.
console.log(fitChars(ctx, chars, 0, 50)); // expected 5
console.log(fitChars(ctx, chars, 0, 55)); // expected 5
console.log(fitChars(ctx, chars, 0, 60)); // expected 6
console.log(fitChars(ctx, chars, 6, 120)); // expected 11
