// components/Boards/ReadOnlyCanvas.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { Block } from "@/types/types";
import ReadOnlyBlock from "../Blocks/ReadOnlyBlock";
import Header from "./Header";

type ReadOnlyCanvasProps = {
  title: string;
  blocks: Block[];
  open: boolean;
  // Optional: allow clicking board blocks to navigate
  onBoardClick?: (linkedBoardId: string) => void;

  // Optional: initial view (if you want)
  initialScale?: number;
  initialPan?: { x: number; y: number };
};

export default function ReadOnlyCanvas({
  title,
  blocks,
  open,
  onBoardClick,
  initialScale = 1,
  initialPan = { x: 0, y: 0 },
}: ReadOnlyCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan/zoom
  const [scale, setScale] = useState(initialScale);
  const [pan, setPan] = useState(initialPan);

  // Sort once per blocks change
  const sortedBlocks = useMemo(() => {
    return [...blocks].sort((a, b) => a.location.zIndex - b.location.zIndex);
  }, [blocks]);

  useEffect(() => {
  const el = containerRef.current;
  if (!el) return;

  const handler = (e: WheelEvent) => {
    e.preventDefault();

    const rect = el.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const isZoomGesture = e.ctrlKey;
    const zoomIntensity = 0.01;

    if (isZoomGesture) {
      const pointX = (mouseX - pan.x) / scale;
      const pointY = (mouseY - pan.y) / scale;

      const zoom = 1 - e.deltaY * zoomIntensity;
      const newScale = Math.min(Math.max(0.1, scale * zoom), 5);

      const newPanX = mouseX - pointX * newScale;
      const newPanY = mouseY - pointY * newScale;

      setScale(newScale);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  el.addEventListener("wheel", handler, { passive: false });
  return () => el.removeEventListener("wheel", handler);
}, [pan, scale]);

  // Center view on blocks once (or when blocks change)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (blocks.length === 0) return;

    const rect = el.getBoundingClientRect();

    let sumX = 0;
    let sumY = 0;

    for (const b of blocks) {
      sumX += b.location.x + b.location.width / 2;
      sumY += b.location.y + b.location.height / 2;
    }

    const cx = sumX / blocks.length;
    const cy = sumY / blocks.length;

    // keep scale as-is; center based on current scale
    setPan({
      x: rect.width / 2 - cx * scale,
      y: rect.height / 2 - cy * scale,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks.length]);

  return (
    <div className="h-full flex-1 flex flex-col">
      {/* Header is OUTSIDE zoom transform, so it never scales */}
      {open && <Header
        title={title}
        scale={scale}
        setPan={setPan}
        setScale={setScale}
        readonly={true}
      />}
        
      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-hidden"
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: "0 0",
              position: "absolute",
              width: "20000px",
              height: "20000px",
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              {sortedBlocks.map((block) => (
                <ReadOnlyBlock
                  key={block.id}
                  node={block}
                  onBoardClick={onBoardClick}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
