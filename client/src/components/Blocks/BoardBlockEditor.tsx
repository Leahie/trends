import type { BoardBlockType, Location } from "@/types/types";
import { useMemo } from "react";

type Props = BoardBlockType & {
  dims: Location;
  isDropTarget?: boolean;
  onDrop?: () => void;
  onOpen?: (linkedBoardId: string) => void;
};

export default function BoardBlockEditor({
  content,
  dims,
  linkedBoardId,
  isDropTarget,
  onDrop,
  onOpen,
}: Props) {

  const fontSizeMultiplier = useMemo(() => {
    const avgDimension = (dims.width + dims.height) / 2;
    return Math.max(0.5, Math.min(3, avgDimension / 200));
  }, [dims.width, dims.height]);

  const canOpen = !!linkedBoardId && !!onOpen;

  return (
    <div
      className="flex flex-col group h-full w-full border-light-accent border-t-5 border-b-10 border-r-10 relative"
      onMouseUp={isDropTarget ? onDrop : undefined}
      onDoubleClick={(e) => {
        if (!canOpen) return;
        e.stopPropagation();
        onOpen!(linkedBoardId);
      }}
    >
      <div className="absolute inset-y-0 left-1 w-1.5 -translate-x-1/2 bg-black/30 pointer-events-none" />

      {/* Drop overlay */}
      {isDropTarget && (
        <div className="absolute inset-0 bg-highlight/20 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-highlight border-dashed pointer-events-none">
          <div className="bg-dark/90 px-6 py-3 rounded-lg border border-highlight">
            <p className="text-heading font-semibold text-center">
              Drop blocks to add to board
            </p>
          </div>
        </div>
      )}

      <div className="shrink-0 bg-accent">
        <h5
          style={{
            fontSize: `${15 * fontSizeMultiplier}px`,
            padding: `${10 * fontSizeMultiplier}px`,
          }}
          className="mb-3 font-semibold tracking-tight text-heading leading-8"
        >
          {content.title}
        </h5>
      </div>

      <hr />

      {/* <div className="flex-1 diary-block flex items-center justify-center">
        {canOpen && (
          <span className="text-xs opacity-40">
            Double-click to open →
          </span>
        )}
      </div> */}
      <div className="flex-1 diary-block flex items-center justify-center">

          <span className="text-xs text-primary group-hover:opacity-100 opacity-10">
            Ctrl + Click to open
          </span>
      </div>
    </div>
  );
}
