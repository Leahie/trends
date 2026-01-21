import React, { useRef, useState, useEffect } from "react";
import type { ImageBlockType } from "@/types/types";
import { Check, X } from "lucide-react";

interface CropOverlayProps {
  block: ImageBlockType;
  onApply: (crop: { xRatio: number; yRatio: number; widthRatio: number; heightRatio: number; scale: number }) => void;
  onCancel: () => void;
}

export default function CropOverlay({ block, onApply, onCancel }: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [imageDisplaySize, setImageDisplaySize] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (!imageRef.current || !containerRef.current) return;
      
      // Image reference available if needed
      // const img = imageRef.current;
      const containerRect = containerRef.current.getBoundingClientRect();
      
      const naturalWidth = block.content.imgWidth;
      const naturalHeight = block.content.imgHeight;
      const imageAspect = naturalWidth / naturalHeight;
      
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      const containerAspect = containerWidth / containerHeight;
      
      let displayWidth, displayHeight, offsetX, offsetY;
      
      if (imageAspect > containerAspect) {
        displayWidth = containerWidth;
        displayHeight = containerWidth / imageAspect;
        offsetX = 0;
        offsetY = (containerHeight - displayHeight) / 2;
      } else {
        // Image is taller - fit to height
        displayHeight = containerHeight;
        displayWidth = containerHeight * imageAspect;
        offsetX = (containerWidth - displayWidth) / 2;
        offsetY = 0;
      }
      
      setImageDisplaySize({ width: displayWidth, height: displayHeight, offsetX, offsetY });
      
      if (block.content.transforms?.crop) {
        const crop = block.content.transforms.crop;
        setCropRect({
          x: offsetX + crop.xRatio * displayWidth,
          y: offsetY + crop.yRatio * displayHeight,
          width: crop.widthRatio * displayWidth,
          height: crop.heightRatio * displayHeight,
        });
      } else {
        setCropRect({
          x: offsetX,
          y: offsetY,
          width: displayWidth,
          height: displayHeight,
        });
      }
    };

    const img = imageRef.current;
    if (img?.complete) {
      updateSize();
    } else if (img) {
      img.onload = updateSize;
    }

    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [block]);

  const handleMouseDown = (e: React.MouseEvent, action: "drag" | "resize", handle?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragStart({ x: e.clientX, y: e.clientY });
    if (action === "drag") setIsDragging(true);
    if (action === "resize" && handle) setIsResizing(handle);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging && !isResizing) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    const { width: imgWidth, height: imgHeight, offsetX, offsetY } = imageDisplaySize;
    const maxX = offsetX + imgWidth;
    const maxY = offsetY + imgHeight;

    setCropRect((prev) => {
      let newRect = { ...prev };

      // Drag
      if (isDragging) {
        newRect.x = Math.max(offsetX, Math.min(maxX - prev.width, prev.x + deltaX));
        newRect.y = Math.max(offsetY, Math.min(maxY - prev.height, prev.y + deltaY));
      }

      // Resize handles
      if (isResizing) {
        if (isResizing.includes("n")) {
          const newY = Math.max(offsetY, prev.y + deltaY);
          newRect.height = prev.height + (prev.y - newY);
          newRect.y = newY;
        }
        if (isResizing.includes("s")) {
          newRect.height = Math.max(20, Math.min(maxY - prev.y, prev.height + deltaY));
        }
        if (isResizing.includes("w")) {
          const newX = Math.max(offsetX, prev.x + deltaX);
          newRect.width = prev.width + (prev.x - newX);
          newRect.x = newX;
        }
        if (isResizing.includes("e")) {
          newRect.width = Math.max(20, Math.min(maxX - prev.x, prev.width + deltaX));
        }
      }

      return newRect;
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(null);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, imageDisplaySize]);

  const handleApply = () => {
    const { width: imgWidth, height: imgHeight, offsetX, offsetY } = imageDisplaySize;
    if (!containerRef.current) return null;

    // Convert crop rectangle to ratios relative to the actual image
    const crop = {
      xRatio: (cropRect.x - offsetX) / imgWidth,
      yRatio: (cropRect.y - offsetY) / imgHeight,
      widthRatio: cropRect.width / imgWidth,
      heightRatio: cropRect.height / imgHeight,
      scale: block.location.width/imgWidth,
    };

    onApply(crop);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="relative max-w-4xl max-h-[80vh]" ref={containerRef}>
        <img
          ref={imageRef}
          src={block.content.url}
          alt="Crop preview"
          className="max-w-full max-h-[80vh] object-contain"
          draggable={false}
        />

        {/* Crop rectangle */}
        <div
          className="absolute border-2 border-white cursor-move"
          style={{
            left: cropRect.x,
            top: cropRect.y,
            width: cropRect.width,
            height: cropRect.height,
          }}
          onMouseDown={(e) => handleMouseDown(e, "drag")}
        >
          {["nw", "n", "ne", "w", "e", "sw", "s", "se"].map((handle) => (
            <div
              key={handle}
              className={`absolute w-3 h-3 bg-white border border-gray-800 ${
                handle.includes("n") ? "top-0 -translate-y-1/2" : handle.includes("s") ? "bottom-0 translate-y-1/2" : "top-1/2 -translate-y-1/2"
              } ${
                handle.includes("w") ? "left-0 -translate-x-1/2" : handle.includes("e") ? "right-0 translate-x-1/2" : "left-1/2 -translate-x-1/2"
              } cursor-${handle}-resize`}
              onMouseDown={(e) => handleMouseDown(e, "resize", handle)}
            />
          ))}
        </div>

        {/* Dark overlay outside crop */}
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <mask id="crop-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={cropRect.x}
                  y={cropRect.y}
                  width={cropRect.width}
                  height={cropRect.height}
                  fill="black"
                />
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#crop-mask)" />
          </svg>
        </div>
      </div>

      {/* Controls */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 bg-highlight hover:bg-dark text-white rounded-lg transition-colors"
        >
          <X size={18} /> Cancel
        </button>
        <button
          onClick={handleApply}
          className="flex items-center gap-2 px-4 py-2 bg-light-accent hover:bg-accent text-white rounded-lg transition-colors"
        >
          <Check size={18} /> Apply Crop
        </button>
      </div>
    </div>
  );
}