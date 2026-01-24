import type { BoardBlockType, Location } from "@/types/types";
import { useMemo } from "react";

type Props = BoardBlockType & {
  dims: Location;
  onOpen?: (id: string) => void;
};

export default function BoardBlockView({
  content,
  linkedBoardId,
  dims,
  onOpen,
}: Props) {
  const fontSizeMultiplier = useMemo(() => {
    const avg = (dims.width + dims.height) / 2;
    return Math.max(0.5, Math.min(3, avg / 200));
  }, [dims.width, dims.height]);

  const canOpen = !!onOpen && !!linkedBoardId;

  return (
    <div
      className={`flex flex-col h-full w-full border-light-accent border-t-5 border-b-10 border-r-10 ${
        canOpen ? "cursor-pointer hover:brightness-110" : ""
      }`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (canOpen) onOpen!(linkedBoardId);
      }}
    >
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

      <div className="flex-1 flex items-center justify-center text-sm opacity-60">
        Click to view →
      </div>
    </div>
  );
}
