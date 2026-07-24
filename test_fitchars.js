function fitCharsOld(chars, start, maxWidth) {
  let best = start;
  for (let i = start + 1; i <= chars.length; i++) {
    const chunk = chars.slice(start, i).join("");
    if (chunk.length > maxWidth) break; // mock measureText
    best = i;
  }
  return best;
}

function fitCharsNew(chars, start, maxWidth) {
  let best = start;
  let chunk = "";
  for (let i = start + 1; i <= chars.length; i++) {
    chunk += chars[i - 1];
    if (chunk.length > maxWidth) break; // mock measureText
    best = i;
  }
  return best;
}

const chars = Array.from("hello world this is a test");
console.log(fitCharsOld(chars, 0, 5) === fitCharsNew(chars, 0, 5));
console.log(fitCharsOld(chars, 3, 10) === fitCharsNew(chars, 3, 10));
console.log(fitCharsOld(chars, 0, 100) === fitCharsNew(chars, 0, 100));
