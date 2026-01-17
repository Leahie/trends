import React from "react";
import { ChromePicker } from "react-color";

interface props{
    open: boolean;
    baseColor: string;
    onClose: () => void;
    onSave: (color: string) => void;
    onChange: (color: string) => void;
}
export default function ThemeModal({
  open,
  baseColor,
  onClose,
  onSave,
  onChange
}: props){
    if (!open) return null;

    return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark text-white p-6 rounded-xl shadow-xl w-[340px] border border-accent" onClick={(e) => e.stopPropagation()}>
        
        <h2 className="text-lg font-semibold mb-4">Customize Theme</h2>

        <div className="mb-6">
          <ChromePicker
            color={baseColor}
            onChange={(c) => onChange(c.hex)}
            disableAlpha
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-dark hover:bg-highlight text-white border border-accent"
          >
            Cancel
          </button>

          <button
            onClick={() => onSave(baseColor)}
            className="px-4 py-2 rounded bg-accent hover:bg-highlight text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );


}