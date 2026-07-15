export interface FittedLabel {
  lines: string[];
  fontPx: number;
  lineHeight: number;
}

const LINE_HEIGHT_RATIO = 1.16;

export function fitLabelInBox(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  maxWidth: number,
  maxHeight: number,
  fontFamily: string,
  fontWeight: number,
  baseFontPx: number,
  minFontPx: number,
  dpr: number,
): FittedLabel | null {
  const text = normalizeLabel(rawText);
  if (!text) return null;

  const step = Math.max(0.5, 0.5 * dpr);
  for (let fontPx = baseFontPx; fontPx >= minFontPx - 0.01; fontPx -= step) {
    const fitted = tryFitAtSize(
      ctx,
      text,
      fontPx,
      maxWidth,
      maxHeight,
      fontFamily,
      fontWeight,
      dpr,
    );
    if (fitted) return fitted;
  }

  return fallbackSingleLine(
    ctx,
    text,
    maxWidth,
    maxHeight,
    fontFamily,
    fontWeight,
    minFontPx,
    dpr,
  );
}

function tryFitAtSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontPx: number,
  maxWidth: number,
  maxHeight: number,
  fontFamily: string,
  fontWeight: number,
  dpr: number,
): FittedLabel | null {
  ctx.font = `${fontWeight} ${fontPx}px ${fontFamily}`;
  const lineHeight = Math.max(fontPx * LINE_HEIGHT_RATIO, fontPx + 1 * dpr);
  const maxLines = Math.max(1, Math.min(4, Math.floor(maxHeight / lineHeight)));
  const lines = wrapIntoLines(ctx, text, maxWidth, maxLines);
  if (lines.length === 0) return null;
  if (lines.length * lineHeight > maxHeight + 0.5 * dpr) return null;
  return { lines, fontPx, lineHeight };
}

function fallbackSingleLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  fontFamily: string,
  fontWeight: number,
  minFontPx: number,
  dpr: number,
): FittedLabel | null {
  ctx.font = `${fontWeight} ${minFontPx}px ${fontFamily}`;
  const lineHeight = Math.max(
    minFontPx * LINE_HEIGHT_RATIO,
    minFontPx + 1 * dpr,
  );
  if (lineHeight > maxHeight) return null;
  return {
    lines: [ellipsize(ctx, text, maxWidth)],
    fontPx: minFontPx,
    lineHeight,
  };
}

function wrapIntoLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const chars = Array.from(text);
  const lines: string[] = [];
  let cursor = 0;

  while (cursor < chars.length && lines.length < maxLines) {
    const next = chooseLineEnd(ctx, chars, cursor, maxWidth);
    if (next.end <= cursor) break;
    const line = chars.slice(cursor, next.end).join("").trim();
    cursor = skipLeadingSpaces(chars, next.end);
    if (line) lines.push(line);
  }

  if (lines.length === 0) return [];
  return appendEllipsizedRemainder(ctx, lines, chars, cursor, maxWidth);
}

function chooseLineEnd(
  ctx: CanvasRenderingContext2D,
  chars: string[],
  start: number,
  maxWidth: number,
): { end: number } {
  const hardEnd = fitChars(ctx, chars, start, maxWidth);
  if (hardEnd >= chars.length) return { end: hardEnd };
  const softEnd = findSoftBreak(chars, start, hardEnd);
  return { end: softEnd > start + 1 ? softEnd : hardEnd };
}

function skipLeadingSpaces(chars: string[], from: number): number {
  let i = from;
  while (i < chars.length && chars[i] === " ") i++;
  return i;
}

function appendEllipsizedRemainder(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  chars: string[],
  cursor: number,
  maxWidth: number,
): string[] {
  if (cursor >= chars.length) return lines;
  const remaining = chars.slice(cursor).join("").trim();
  if (!remaining) return lines;
  const lastLine = lines.at(-1) ?? "";
  const combined = `${lastLine} ${remaining}`;
  lines[lines.length - 1] = ellipsize(ctx, combined, maxWidth);
  return lines;
}

function fitChars(
  ctx: CanvasRenderingContext2D,
  chars: string[],
  start: number,
  maxWidth: number,
): number {
  let best = start;
  for (let i = start + 1; i <= chars.length; i++) {
    const chunk = chars.slice(start, i).join("");
    if (ctx.measureText(chunk).width > maxWidth) break;
    best = i;
  }
  return best;
}

function findSoftBreak(
  chars: string[],
  start: number,
  hardEnd: number,
): number {
  for (let i = hardEnd; i > start; i--) {
    if (isBreakChar(chars[i - 1])) return i;
  }
  return hardEnd;
}

const BREAK_CHARS = new Set([" ", "/", "\\", "_", "-", ".", ":"]);

function isBreakChar(ch: string): boolean {
  return BREAK_CHARS.has(ch);
}

function ellipsize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string {
  if (ctx.measureText(text).width <= maxW) return text;
  const ell = "…";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + ell).width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + ell;
}

function normalizeLabel(raw: string): string {
  return raw.replaceAll(/\s+/g, " ").trim();
}
