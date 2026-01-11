import { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '@/context/data';
import { useEditor } from '@/context/editor';
import type { Block } from '@/types/types';

type HandleType = "right" | "left" | "bottom" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface GroupResizeWrapperProps {
  scale: number;
}

export default function GroupResizeWrapper({ scale }: GroupResizeWrapperProps) {
  const { blocks, batchUpdateBlocks } = useData();
  const { selectedBlockIds, pushToHistory } = useEditor();

  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<HandleType | null>(null);
  const [startMouse, setStartMouse] = useState({ x: 0, y: 0 });

  // Store initial bounds and block states
  const initialState = useRef<{
    bounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number};
    blocks: Record<string, { x: number; y: number; width: number; height: number }>;
  } | null>(null);

  const selectedBlocks = useMemo(() => {
    return blocks.filter(b => selectedBlockIds.includes(b.id));
  }, [blocks, selectedBlockIds]);

  // Calculate bounds of all selected blocks
  const groupBounds = useMemo(() => {
    if (selectedBlocks.length === 0) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    selectedBlocks.forEach(block => {
      minX = Math.min(minX, block.location.x);
      maxX = Math.max(maxX, block.location.x + block.location.width);
      minY = Math.min(minY, block.location.y);
      maxY = Math.max(maxY, block.location.y + block.location.height);
    });

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [selectedBlocks]);

  // Don't show if only one block selected (handled by ResizeableContainer)
  if (selectedBlockIds.length <= 1 || !groupBounds) return null;

  const startResize = (handle: HandleType) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    setStartMouse({ x: e.clientX, y: e.clientY });

    // Store initial state
    initialState.current = {
      bounds: { ...groupBounds },
      blocks: Object.fromEntries(
        selectedBlocks.map(block => [
          block.id,
          {
            x: block.location.x,
            y: block.location.y,
            width: block.location.width,
            height: block.location.height,
          }
        ])
      )
    };
  };

  useEffect(() => {
    if (!isResizing || !resizeHandle || !initialState.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - startMouse.x) / scale;
      const dy = (e.clientY - startMouse.y) / scale;

      const initial = initialState.current!;
      const oldBounds = initial.bounds;

      // Calculate new bounds based on resize handle
      let newBounds = { ...oldBounds };

      switch (resizeHandle) {
        case 'right':
          newBounds.maxX = oldBounds.maxX + dx;
          newBounds.width = newBounds.maxX - newBounds.minX;
          break;
        case 'left':
          newBounds.minX = oldBounds.minX + dx;
          newBounds.width = newBounds.maxX - newBounds.minX;
          break;
        case 'bottom':
          newBounds.maxY = oldBounds.maxY + dy;
          newBounds.height = newBounds.maxY - newBounds.minY;
          break;
        case 'top':
          newBounds.minY = oldBounds.minY + dy;
          newBounds.height = newBounds.maxY - newBounds.minY;
          break;
        case 'top-left':
          newBounds.minX = oldBounds.minX + dx;
          newBounds.minY = oldBounds.minY + dy;
          newBounds.width = newBounds.maxX - newBounds.minX;
          newBounds.height = newBounds.maxY - newBounds.minY;
          break;
        case 'top-right':
          newBounds.maxX = oldBounds.maxX + dx;
          newBounds.minY = oldBounds.minY + dy;
          newBounds.width = newBounds.maxX - newBounds.minX;
          newBounds.height = newBounds.maxY - newBounds.minY;
          break;
        case 'bottom-left':
          newBounds.minX = oldBounds.minX + dx;
          newBounds.maxY = oldBounds.maxY + dy;
          newBounds.width = newBounds.maxX - newBounds.minX;
          newBounds.height = newBounds.maxY - newBounds.minY;
          break;
        case 'bottom-right':
          newBounds.maxX = oldBounds.maxX + dx;
          newBounds.maxY = oldBounds.maxY + dy;
          newBounds.width = newBounds.maxX - newBounds.minX;
          newBounds.height = newBounds.maxY - newBounds.minY;
          break;
      }

      // Prevent bounds from becoming too small
      const minSize = 100;
      if (newBounds.width < minSize || newBounds.height < minSize) return;

      // Calculate scale factors
      const scaleX = newBounds.width / oldBounds.width;
      const scaleY = newBounds.height / oldBounds.height;

      // Update all blocks proportionally
      const updates: Record<string, Partial<Block>> = {};

      selectedBlocks.forEach(block => {
        const initialBlock = initial.blocks[block.id];
        if (!initialBlock) return;

        // Calculate relative position within old bounds
        const relX = (initialBlock.x - oldBounds.minX) / oldBounds.width;
        const relY = (initialBlock.y - oldBounds.minY) / oldBounds.height;
        const relWidth = initialBlock.width / oldBounds.width;
        const relHeight = initialBlock.height / oldBounds.height;

        // Apply to new bounds
        const newX = newBounds.minX + (relX * newBounds.width);
        const newY = newBounds.minY + (relY * newBounds.height);
        const newWidth = relWidth * newBounds.width;
        const newHeight = relHeight * newBounds.height;

        updates[block.id] = {
          location: {
            ...block.location,
            x: Math.max(0, newX),
            y: Math.max(0, newY),
            width: Math.max(50, newWidth),
            height: Math.max(50, newHeight),
          }
        };
      });

      batchUpdateBlocks(updates);
    };

    const handleMouseUp = () => {
      if (initialState.current) {
        // Save to history
        const before: Record<string, Block> = {};
        const after: Record<string, Block> = {};

        selectedBlocks.forEach(block => {
          const initialBlock = initialState.current!.blocks[block.id];
          if (initialBlock) {
            before[block.id] = {
              ...block,
              location: {
                ...block.location,
                ...initialBlock
              }
            };
            after[block.id] = block;
          }
        });

        pushToHistory(before, after);
      }

      setIsResizing(false);
      setResizeHandle(null);
      initialState.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeHandle, startMouse, scale, selectedBlocks, batchUpdateBlocks, pushToHistory]);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${groupBounds.minX}px`,
        top: `${groupBounds.minY}px`,
        width: `${groupBounds.width}px`,
        height: `${groupBounds.height}px`,
        border: '3px solid rgba(59, 130, 246, 1)',
        pointerEvents: 'none',
        zIndex: 1001,
        boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.5)',
      }}
    >
      {/* Resize handles */}
      <div 
        className="resize-handle top top-bottom" 
        onMouseDown={startResize("top")}
        style={{ pointerEvents: 'auto' }}
      />
      <div 
        className="resize-handle bottom top-bottom" 
        onMouseDown={startResize("bottom")}
        style={{ pointerEvents: 'auto' }}
      />
      <div 
        className="resize-handle left left-right" 
        onMouseDown={startResize("left")}
        style={{ pointerEvents: 'auto' }}
      />
      <div 
        className="resize-handle right left-right" 
        onMouseDown={startResize("right")}
        style={{ pointerEvents: 'auto' }}
      />
      
      <div 
        className="resize-handle diagonal top-left" 
        onMouseDown={startResize("top-left")}
        style={{ pointerEvents: 'auto' }}
      />
      <div 
        className="resize-handle diagonal top-right" 
        onMouseDown={startResize("top-right")}
        style={{ pointerEvents: 'auto' }}
      />
      <div 
        className="resize-handle diagonal bottom-left" 
        onMouseDown={startResize("bottom-left")}
        style={{ pointerEvents: 'auto' }}
      />
      <div 
        className="resize-handle diagonal bottom-right" 
        onMouseDown={startResize("bottom-right")}
        style={{ pointerEvents: 'auto' }}
      />
    </div>
  );
}