import { useData } from "@/context/data";
import type { Board } from "@/types/types";
import { useEffect, useState } from "react";

interface DraggableItemProps {
  board: Board;
  draggingId: string | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDropBefore?: (e: React.DragEvent) => void;
  onDropAfter?: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  showDropBefore?: boolean | null;
  showDropAfter?: boolean | null;
  depth?: number;
  children: React.ReactNode;
}

export default function DraggableItem({
  board,
  draggingId,
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
}: DraggableItemProps) {
  const {getParent, getChildren} =  useData();
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropBeforeActive, setDropBeforeActive] = useState(false);
  const [dropAfterActive, setDropAfterActive] = useState(false);
  
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    console.log("see the bool", board.id, draggingId)
    console.log(getParent(board.id))
    const valid =  !draggingId ? false : !(getChildren(draggingId).includes(board));
    setIsValid(valid)
  })

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
    onDragOver?.(e);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    onDrop?.(e);
  };

  const handleDropBefore = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropBeforeActive(false);
    onDropBefore?.(e);
  };

  const handleDropAfter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropAfterActive(false);
    onDropAfter?.(e);
  };

  return (
    <li 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={onDrop ? handleDragOver : undefined}
      onDragLeave={onDrop ? handleDragLeave : undefined}
      onDrop={(isValid && onDrop) ? handleDrop : undefined}
      className={`relative focus:outline-none rounded-xl
        ${isValid && isDragOver && onDrop ? "ring-1 ring-light-accent ring-offset-1 opacity-50" : ""}
        ${ isDragging ? "opacity-50" : ""}
        transition-all
      `}  
    >
      {/* Drop zone BEFORE this item */}
      {showDropBefore && onDropBefore && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDropBeforeActive(true);
          }}
          onDragLeave={() => setDropBeforeActive(false)}
          onDrop={handleDropBefore}
          className={`h-1 transition-all ${
            dropBeforeActive ? "bg-light-accent/50 h-4" : "bg-transparent"
          }`}
          style={{ paddingLeft: `${depth * 12}px` }}
        />
      )}

      <div>
        {children}
      </div>


      {/* Drop zone AFTER this item */}
      {showDropAfter && onDropAfter && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDropAfterActive(true);
          }}
          onDragLeave={() => setDropAfterActive(false)}
          onDrop={handleDropAfter}
          className={`h-1 transition-all ${
            dropAfterActive ? "bg-light-accent/50 h-4" : "bg-transparent"
          }`}
          style={{ paddingLeft: `${depth * 12}px` }}
        />
      )}
    </li>
  );
}