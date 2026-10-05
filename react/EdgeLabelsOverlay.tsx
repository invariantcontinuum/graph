import { useRef, useCallback } from "react";
import type { GraphHandle } from "./Graph";
import type { GraphTheme } from "./theme/types";
import { worldToScreenX, worldToScreenY, bitKey } from "./overlays/vpMath";
import { useOverlayRenderLoop } from "./overlays/useOverlayRenderLoop";
import { useEngineFrameState } from "./overlays/useEngineFrameState";
import { useEngineEdgesState } from "./overlays/useEngineEdgesState";

export interface EdgeLabelsOverlayProps {
  readonly engineRef: React.RefObject<GraphHandle | null>;
  readonly theme: GraphTheme;
  readonly ready: boolean;
}

export function EdgeLabelsOverlay({
  engineRef,
  theme,
  ready,
}: EdgeLabelsOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { frameRef, dirtyRef } = useEngineFrameState(engineRef, ready);
  const edgesRef = useEngineEdgesState(engineRef, ready, dirtyRef);

  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, cvs: HTMLCanvasElement) => {
      const { edgeData, edgeTypeKeys, focusIdx } = edgesRef.current;
      const { positions, vpMatrix: vp } = frameRef.current;
      if (focusIdx < 0 || !edgeData || !positions || !vp) return;

      const focusOff = focusIdx * 4;
      if (focusOff + 1 >= positions.length) return;
      const focusKey = bitKey(positions[focusOff], positions[focusOff + 1]);

      ctx.font = "600 10px 'Manrope', sans-serif";
      for (let i = 0; i + 6 <= edgeData.length; i += 6) {
        const sx = edgeData[i],
          sy = edgeData[i + 1],
          tx = edgeData[i + 2],
          ty = edgeData[i + 3];
        const sKey = bitKey(sx, sy);
        const tKey = bitKey(tx, ty);
        if (sKey !== focusKey && tKey !== focusKey) continue;

        const typeIdx = Math.floor(edgeData[i + 4]);
        const label = edgeTypeKeys[typeIdx]?.replaceAll("_", " ") ?? "";
        if (!label) continue;

        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        const screenX = worldToScreenX(mx, my, vp, cvs.width);
        const screenY = worldToScreenY(mx, my, vp, cvs.height);

        const pad = 5;
        const w = ctx.measureText(label).width + pad * 2;
        const h = 16;
        ctx.fillStyle = theme.hullFill;
        ctx.strokeStyle = theme.hullStroke;
        ctx.lineWidth = 1;
        const rx = screenX - w / 2,
          ry = screenY - h / 2;
        const r = 3;
        ctx.beginPath();
        ctx.moveTo(rx + r, ry);
        ctx.lineTo(rx + w - r, ry);
        ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + r);
        ctx.lineTo(rx + w, ry + h - r);
        ctx.quadraticCurveTo(rx + w, ry + h, rx + w - r, ry + h);
        ctx.lineTo(rx + r, ry + h);
        ctx.quadraticCurveTo(rx, ry + h, rx, ry + h - r);
        ctx.lineTo(rx, ry + r);
        ctx.quadraticCurveTo(rx, ry, rx + r, ry);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = theme.defaultNodeStyle.labelColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, screenX, screenY);
      }
    },
    [theme],
  );

  useOverlayRenderLoop(canvasRef, dirtyRef, renderFrame);

  return (
    <canvas
      ref={canvasRef}
      className="graph-edge-labels-overlay"
      aria-hidden={true}
      tabIndex={-1}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        pointerEvents: "none",
        width: "100%",
        height: "100%",
      }}
    />
  );
}
