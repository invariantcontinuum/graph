import { useRef, useCallback, useMemo } from "react";
import type { GraphHandle } from "./Graph";
import type { GraphTheme, NodeTypeStyle } from "./theme/types";
import {
  layoutLabelChip,
  glyphSupported,
  CHIP_PAD_Y,
  CHIP_GAP,
  type ChipLayout,
} from "./overlays/labels/chipLayout";
import { worldToScreenX, worldToScreenY, screenZoom } from "./overlays/vpMath";
import { useOverlayRenderLoop } from "./overlays/useOverlayRenderLoop";
import { useEngineFrameState } from "./overlays/useEngineFrameState";

export interface LabelOverlayProps {
  readonly engineRef: React.RefObject<GraphHandle | null>;
  readonly theme: GraphTheme;
  /** Ordered list of node ids matching the engine's internal positions buffer order.
   *  MUST match the order of `snapshot.nodes` passed to `<Graph>`. */
  readonly nodeIds: string[];
  /** Map nodeId -> label text (e.g., node.name). */
  readonly labels: Record<string, string>;
  /** Map nodeId -> type (drives per-type font/size/color). */
  readonly nodeTypes: Record<string, string>;
  /** Below this zoom (from vpMatrix scale), labels are hidden to preserve FPS. */
  readonly minZoomToShowLabels?: number;
  /** True once the `<Graph>` component signalled `onReady` — before this the
   *  engine ref's `subscribeFrame` is not yet wired up and subscribing will
   *  silently no-op, so we must gate the subscription on it. */
  readonly ready: boolean;
  /** Accepted but currently unused — the WASM shader already dims non-focus
   *  node fills via `u_dim_opacity`; previous experiments dimming the
   *  Canvas2D label alpha made the 1-hop neighborhood unreadable so we keep
   *  labels at uniform brightness. The prop is preserved on the public API
   *  so callers can opt into per-focus label styling in a future minor. */
  readonly focusIds?: Set<string> | null;
}

interface FrameState {
  positions: Float32Array | null;
  vpMatrix: Float32Array | null;
}

const LABEL_CULL_MARGIN_PX = 200;
const MIN_NODE_WIDTH_PX = 10;
const MIN_NODE_HEIGHT_PX = 5;
const CHIP_MIN_WIDTH_RATIO = 1.6;
const CHIP_MIN_WIDTH_PX = 90;
const CHIP_TAG_MIN_NODE_HEIGHT_PX = 40;
const CHIP_TAG_FONT_RATIO = 0.62;
const CHIP_TAG_MIN_FONT_PX = 6;
const MIN_LABEL_FONT_PX = 6;
const MAX_LABEL_FONT_PX = 22;
const DEFAULT_LABEL_FONT_PX = 12;
const DEFAULT_LABEL_FONT_FAMILY = "sans-serif";
const DEFAULT_LABEL_FONT_WEIGHT = 760;
const STROKE_WIDTH_FLOOR_PX = 1.5;
const STROKE_WIDTH_RATIO = 0.2;

export function LabelOverlay({
  engineRef,
  theme,
  nodeIds,
  labels,
  nodeTypes,
  minZoomToShowLabels = 0.04,
  ready,
  focusIds,
}: LabelOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelCacheRef = useRef<
    Map<
      string,
      {
        raw: string;
        text: string;
        glyph: string | null;
        fullText: string;
        chars: string[];
        type: string;
        typeTag: string | null;
      }
    >
  >(new Map());
  const { frameRef, dirtyRef } = useEngineFrameState(engineRef, ready);

  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, cvs: HTMLCanvasElement) => {
      const { positions, vpMatrix } = frameRef.current;
      if (!positions || !vpMatrix) return;

      const dpr = window.devicePixelRatio || 1;
      const zoom = screenZoom(vpMatrix, cvs.width, dpr);
      if (zoom >= minZoomToShowLabels) {
        drawAllLabels(ctx, {
          cvs,
          positions,
          vpMatrix,
          zoom,
          dpr,
          nodeIds,
          labels,
          labelCache: labelCacheRef.current,
          nodeTypes,
          theme,
        });
      }
    },
    [nodeIds, labels, nodeTypes, theme, minZoomToShowLabels],
  );

  useOverlayRenderLoop(canvasRef, dirtyRef, renderFrame);

  return (
    <canvas
      ref={canvasRef}
      className="graph-label-overlay"
      aria-hidden={true}
      // The WASM shader dims non-focus fills via u_dim_opacity, so labels stay
      // at uniform brightness. We surface the focus-set size as a data
      // attribute so app CSS / devtools can read it without an extra render
      // path, and so the prop has a concrete consumer (guards against a
      // future refactor silently dropping it from the public API).
      data-focus-count={focusIds?.size ?? 0}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 3,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
}

interface FrameContext {
  cvs: HTMLCanvasElement;
  positions: Float32Array;
  vpMatrix: Float32Array;
  zoom: number;
  dpr: number;
  nodeIds: string[];
  labels: Record<string, string>;
  labelCache: Map<
    string,
    {
      raw: string;
      text: string;
      glyph: string | null;
      fullText: string;
      chars: string[];
      type: string;
      typeTag: string | null;
    }
  >;
  nodeTypes: Record<string, string>;
  theme: GraphTheme;
}

function drawAllLabels(
  ctx: CanvasRenderingContext2D,
  frame: FrameContext,
): void {
  const { positions, nodeIds } = frame;
  // Iterate engine-ordered ids. positions stride-4: [x, y, radius, type_idx].
  for (let i = 0; i < nodeIds.length; i++) {
    const off = i * 4;
    if (off + 1 >= positions.length) break;
    drawOneLabel(ctx, frame, i, off);
  }
}

function drawOneLabel(
  ctx: CanvasRenderingContext2D,
  frame: FrameContext,
  index: number,
  off: number,
): void {
  const {
    positions,
    vpMatrix,
    cvs,
    zoom,
    dpr,
    nodeIds,
    labels,
    labelCache,
    nodeTypes,
    theme,
  } = frame;

  const id = nodeIds[index];
  const wx = positions[off];
  const wy = positions[off + 1];
  const sx = worldToScreenX(wx, wy, vpMatrix, cvs.width);
  const sy = worldToScreenY(wx, wy, vpMatrix, cvs.height);
  if (isOffscreen(sx, sy, cvs)) return;

  const type = nodeTypes[id] ?? "";
  const typeStyle = theme.nodeTypes[type] ?? theme.defaultNodeStyle;

  const halfW = typeStyle.halfWidth ?? theme.defaultNodeStyle.halfWidth;
  const halfH = typeStyle.halfHeight ?? theme.defaultNodeStyle.halfHeight;
  const nodeBoxW = Math.max(halfW * 2 * zoom * dpr, 0);
  const nodeBoxH = Math.max(halfH * 2 * zoom * dpr, 0);

  if (nodeBoxW < MIN_NODE_WIDTH_PX * dpr || nodeBoxH < MIN_NODE_HEIGHT_PX * dpr)
    return;

  const requestedFontSize =
    (typeStyle.labelSize ?? DEFAULT_LABEL_FONT_PX) * zoom * dpr;
  const fontFamily = typeStyle.labelFont ?? DEFAULT_LABEL_FONT_FAMILY;
  const fontWeight = typeStyle.labelWeight ?? DEFAULT_LABEL_FONT_WEIGHT;
  const basePx = Math.min(
    Math.max(requestedFontSize, MIN_LABEL_FONT_PX * dpr),
    MAX_LABEL_FONT_PX * dpr,
  );

  const showTag =
    (theme.showTypeTag ?? true) &&
    nodeBoxH >= CHIP_TAG_MIN_NODE_HEIGHT_PX * dpr;
  const rawGlyph = typeStyle.glyph ?? null;
  const glyph = rawGlyph && glyphSupported(ctx, rawGlyph) ? rawGlyph : null;

  const rawLabel = labels[id] ?? "";
  let cached = labelCache.get(id);
  if (
    !cached ||
    cached.raw !== rawLabel ||
    cached.glyph !== glyph ||
    cached.type !== type
  ) {
    const text = rawLabel.replaceAll(/\s+/g, " ").trim();
    const fullText = glyph ? `${glyph} ${text}` : text;
    const chars = Array.from(fullText);
    cached = {
      raw: rawLabel,
      text,
      glyph,
      fullText,
      chars,
      type,
      typeTag: type ? type.toUpperCase() : null,
    };
    labelCache.set(id, cached);
  }

  const layout = layoutLabelChip(ctx, {
    text: cached.fullText,
    chars: cached.chars,
    typeTag: cached.typeTag,
    maxWidthPx: Math.max(
      nodeBoxW * CHIP_MIN_WIDTH_RATIO,
      CHIP_MIN_WIDTH_PX * dpr,
    ),
    fontPx: basePx,
    tagFontPx: Math.max(
      CHIP_TAG_MIN_FONT_PX * dpr,
      basePx * CHIP_TAG_FONT_RATIO,
    ),
    showTag,
  });
  if (!layout) return;

  const chipTop = sy + nodeBoxH / 2 + CHIP_GAP * dpr;
  if (isChipOffscreen(sx - layout.widthPx / 2, chipTop, layout, cvs)) return;

  paintChip(
    ctx,
    sx,
    chipTop,
    layout,
    typeStyle,
    theme,
    fontFamily,
    fontWeight,
    dpr,
  );
}

function isOffscreen(sx: number, sy: number, cvs: HTMLCanvasElement): boolean {
  return (
    sx < -LABEL_CULL_MARGIN_PX ||
    sx > cvs.width + LABEL_CULL_MARGIN_PX ||
    sy < -LABEL_CULL_MARGIN_PX ||
    sy > cvs.height + LABEL_CULL_MARGIN_PX
  );
}

function isChipOffscreen(
  x: number,
  y: number,
  layout: ChipLayout,
  cvs: HTMLCanvasElement,
): boolean {
  return (
    x + layout.widthPx < -LABEL_CULL_MARGIN_PX ||
    x > cvs.width + LABEL_CULL_MARGIN_PX ||
    y + layout.heightPx < -LABEL_CULL_MARGIN_PX ||
    y > cvs.height + LABEL_CULL_MARGIN_PX
  );
}

function paintChip(
  ctx: CanvasRenderingContext2D,
  sx: number,
  topPy: number,
  layout: ChipLayout,
  typeStyle: NodeTypeStyle,
  theme: GraphTheme,
  fontFamily: string,
  fontWeight: number,
  dpr: number,
): void {
  const x = sx - layout.widthPx / 2;
  const y = topPy;
  const r = Math.min(7 * dpr, layout.heightPx / 2);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, layout.widthPx, layout.heightPx, r);
  ctx.fillStyle = typeStyle.color ?? "rgba(15, 23, 42, 0.9)";
  ctx.fill();
  ctx.strokeStyle = typeStyle.borderColor ?? "rgba(148, 163, 184, 0.55)";
  ctx.lineWidth = Math.max(1, 0.75 * dpr);
  ctx.globalAlpha = 0.55;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.clip();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  let cy = y + CHIP_PAD_Y + layout.lineHeight / 2;
  ctx.font = `${fontWeight} ${layout.fontPx}px ${fontFamily}`;
  ctx.lineWidth = Math.max(
    STROKE_WIDTH_FLOOR_PX * dpr,
    layout.fontPx * STROKE_WIDTH_RATIO,
  );
  ctx.strokeStyle = theme.labelHalo ?? theme.canvasBg;
  ctx.fillStyle = typeStyle.labelColor ?? theme.defaultNodeStyle.labelColor;
  for (const line of layout.lines) {
    ctx.strokeText(line, sx, cy);
    ctx.fillText(line, sx, cy);
    cy += layout.lineHeight;
  }

  if (layout.tag) {
    ctx.font = `600 ${layout.tagFontPx}px ${fontFamily}`;
    ctx.fillStyle = theme.dimText;
    ctx.fillText(
      layout.tag,
      sx,
      y + layout.heightPx - CHIP_PAD_Y - layout.tagLineHeight / 2,
    );
  }
  ctx.restore();
}
