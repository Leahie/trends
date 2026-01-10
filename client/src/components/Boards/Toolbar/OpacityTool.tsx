import type { Operation } from "@/types/editorTypes";
import type { ImageBlockType } from "@/types/types";
import { useState } from "react";

export default function OpacityTool({
  operation,
  selectedBlock,
  handleOperationClick,
  isActive
}: {
  operation: Operation;
  selectedBlock: ImageBlockType | null;
  handleOperationClick: (operation: Operation, params: any) => void;
  isActive: boolean
}) {
  if (selectedBlock == null) return null;

  const [isOpen, setIsOpen] = useState(false);
  const currentOpacity = selectedBlock.content.transforms?.opacity ?? 1;
  const [opacity, setOpacity] = useState(currentOpacity);

  const handleOpacityChange = (value: number) => {
    setOpacity(value);
    handleOperationClick(operation, { opacity: value });
  };

  const handleReset = () => {
    setOpacity(1);
    handleOperationClick(operation, { opacity: 1 });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={!selectedBlock}
        className={`relative group px-3 py-2 rounded transition-colors ${
            isActive
                ? 'bg-accent hover:bg-light-accent text-white'
            : selectedBlock
            ? "hover:bg-highlight text-white"
            : "text-secondary cursor-not-allowed"
        }`}
      >
        {<operation.icon size={18} />}
        <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-white/90 px-2 py-1 text-xs text-black opacity-0 scale-95 transition-all group-hover:opacity-100 group-hover:scale-100">
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-white/90" />
          {operation.label}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onMouseDown={() => setIsOpen(false)}
          />

          <div className="absolute bottom-full mb-2 left-0 bg-dark  rounded-xl shadow-lg z-20 p-4 w-64">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-white">Opacity</span>
              <span className="text-xs text-gray-400">
                {Math.round(opacity * 100)}%
              </span>
            </div>

            <input
              type="range"
              min="0.10"
              max="1"
              step="0.01"
              value={opacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider 
                [&::-webkit-slider-thumb]:appearance-none 
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-4
                [&::-moz-range-thumb]:h-4
                [&::-moz-range-thumb]:bg-white
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgba(255,255,255,${opacity-.05}) 0%, rgba(255,255,255,${opacity-.05}) ${(opacity-.05) * 100}%, #374151 ${(opacity-.05) * 100}%, #374151 100%)`
              }}
            />

            <div className="flex justify-end mt-2">
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleReset();
                }}
                className="text-xs text-secondary hover:underline"
              >
                Reset
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}