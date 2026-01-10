import type { Block } from "@/types/types";
import type { RefObject } from "react";



//Zooms a block to fit the canvas viewport.

export function zoomToBlock(
  canvasRef: RefObject<HTMLDivElement | null>,
  block: Block,
  setScale: (s: number) => void,
  setPan: (p: { x: number; y: number }) => void
) {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const canvasWidth = rect.width;
  const canvasHeight = rect.height;

  // Effective block dimensions with its scale
  const blockWidth = block.location.width * block.location.scaleX;
  const blockHeight = block.location.height * block.location.scaleY;

  // Scale to fit
  const scaleX = canvasWidth / blockWidth;
  const scaleY = canvasHeight / blockHeight;

  const newScale = Math.min(scaleX, scaleY);

  // Center the block in viewport
  const newPanX = canvasWidth / 2 - (block.location.x + blockWidth / 2) * newScale;
  const newPanY = canvasHeight / 2 - (block.location.y + blockHeight / 2) * newScale;

  setScale(newScale);
  setPan({ x: newPanX, y: newPanY });
}
