import { X, Space, MousePointer2, ArrowRightToLine, MousePointerClick } from 'lucide-react';


interface HelpModalProps {
    open: boolean;
    onClose: () => void;
}

export default function HelpModal({ open, onClose }: HelpModalProps){

    if (!open) return null;


    return(<div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" 
            onClick={onClose}
        >
            <div 
                className="bg-dark text-white p-6 rounded-xl shadow-xl w-125 border border-accent" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Help</h2>
                    <button onClick={onClose} className="hover:bg-highlight p-1 rounded">
                        <X size={20} />
                    </button>
                </div>

               <div>
                <ul>
                    <div className="grid grid-cols-2 gap-4 px-3">
                        <div className="text-left">Pan</div>
                        <div className="flex gap-2"><Space className="w-5 h-5"/> Space + Drag </div>

                        <div className="text-left">Add Blocks</div>
                        <div className="flex gap-2"><MousePointer2 className="w-5 h-5"/> Right Click</div>

                        <div className="text-left">Toggle Sidebar</div>
                        <div className="flex gap-2"><ArrowRightToLine className="w-5 h-5"/>Tab</div>

                        <div className="text-left">Zoom into image</div>
                        <div className="flex gap-2"><MousePointerClick className="w-5 h-5"/> Double Click</div>

                        <div className="text-left">Edit Text</div>
                        <div className="flex gap-2"><MousePointerClick className="w-5 h-5"/> Double Click</div>
                    </div>
                </ul>
               </div>
            </div>
        </div>)
}