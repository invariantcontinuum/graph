const chars = Array.from("Hello world! This is a very long text that we need to fit in a box. Testing the measurement speed.");
const ctx = {
    measureText: (str) => ({ width: str.length * 10 })
}

function fitCharsLinear(start, maxWidth) {
  let best = start;
  let chunk = "";
  let calls = 0;
  for (let i = start; i < chars.length; i++) {
    chunk += chars[i];
    calls++;
    if (ctx.measureText(chunk).width > maxWidth) break;
    best = i + 1;
  }
  return { best, calls };
}

function fitCharsLog(start, maxWidth) {
  let lo = start;
  let hi = chars.length;
  let calls = 0;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    let chunk = "";
    for (let i = start; i < mid; i++) chunk += chars[i];
    calls++;
    if (ctx.measureText(chunk).width <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return { best: lo, calls };
}

console.log("Linear:", fitCharsLinear(0, 500));
console.log("Log:", fitCharsLog(0, 500));

console.log("Linear 800:", fitCharsLinear(0, 800));
console.log("Log 800:", fitCharsLog(0, 800));
