import type { Board } from "@/types/types";
import { useState } from "react";

interface DraggableItemProps {
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDropBefore: (e: React.DragEvent) => void;
  onDropAfter: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  showDropBefore?: boolean | null;
  showDropAfter?: boolean | null;
  depth?: number;
  children: React.ReactNode;
  className?: string;
  board: Board;
}

export default function DraggableItem({
  onDragStart,
  onDragOver,
  onDrop,
  onDropBefore,
  onDropAfter,
  onDragEnd,
  showDropBefore,
  showDropAfter,
  depth = 0,
  children,
  className = "",
  board
}: DraggableItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropBeforeActive, setDropBeforeActive] = useState(false);
  const [dropAfterActive, setDropAfterActive] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart(e);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e);
    console.log(board);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
    console.log(board)
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    onDrop(e);
  };

  const handleDropBefore = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropBeforeActive(false);
    onDropBefore(e);
  };

  const handleDropAfter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropAfterActive(false);
    onDropAfter(e);
  };

  return (
    <li className="relative focus:outline-none">
      {/* Drop zone BEFORE this item */}
      {showDropBefore && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDropBeforeActive(true);
          }}
          onDragLeave={() => setDropBeforeActive(false)}
          onDrop={handleDropBefore}
          className={`h-2 transition-all ${
            dropBeforeActive ? "bg-blue-400/50 h-4" : "bg-transparent"
          }`}
          style={{ paddingLeft: `${depth * 12}px` }}
        />
      )}

      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          ${className}
          ${isDragOver ? "ring-2 ring-blue-400 ring-offset-2" : ""}
          ${isDragging ? "opacity-50" : ""}
          transition-all
        `}
      >
        {children}
      </div>

      {/* Drop zone AFTER this item */}
      {showDropAfter && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDropAfterActive(true);
          }}
          onDragLeave={() => setDropAfterActive(false)}
          onDrop={handleDropAfter}
          className={`h-2 transition-all ${
            dropAfterActive ? "bg-blue-400/50 h-4" : "bg-transparent"
          }`}
          style={{ paddingLeft: `${depth * 12}px` }}
        />
      )}
    </li>
  );
}