import { X } from "lucide-react";

interface MoveBlocksModalProps {
    open: boolean;
    boardTitle: string;
    blockCount: number;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function MoveBlocksModal({ 
    open, 
    boardTitle, 
    blockCount, 
    onConfirm, 
    onCancel 
}: MoveBlocksModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onCancel}
            />
            
            <div className="relative bg-dark border-2 border-accent rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
                <button
                    onClick={onCancel}
                    className="absolute top-4 right-4 text-muted hover:text-heading transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-semibold text-heading mb-4">
                    Move Blocks to Board
                </h2>

                <p className="text-body mb-6">
                    Move {blockCount} {blockCount === 1 ? 'block' : 'blocks'} to <span className="font-semibold text-heading">"{boardTitle}"</span>?
                </p>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 bg-medium text-body rounded hover:bg-light transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-highlight text-white rounded hover:opacity-90 transition-opacity"
                    >
                        Confirm 
                    </button>
                </div>
            </div>
        </div>
    );
}