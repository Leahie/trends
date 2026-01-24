import { useOptionalEditor } from "@/context/editor";
import type { Board } from "@/types/types";
import { Download, Share } from "lucide-react";
interface HeaderProps {
    parent?:Board | null;
    title: string;
    scale: number;
    setPan: (arg0: {x:number, y: number}) => void;
    setScale: React.Dispatch<React.SetStateAction<number>>;

    setTitle?: React.Dispatch<React.SetStateAction<string>>;
    setThemeModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    setShareModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    handleExportPDF?: () => Promise<void>;
    setHelpModalOpen?:  React.Dispatch<React.SetStateAction<boolean>>;
    readonly?: boolean;
}
export default function Header({parent, title, setTitle, setScale, scale, setThemeModalOpen, setShareModalOpen, handleExportPDF, setHelpModalOpen, readonly = false}: HeaderProps){
                const editor = useOptionalEditor();
                    
                const handleTitleBlur = async () => {
                    editor?.setIsEditingText(false);
                };
                const handleTitleKeyDown = (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                    } else if (e.key === 'Escape') {
                        if(readonly || !setTitle) return;
                        setTitle(title);
                        
                    }
                };


                return (<div className="w-full gap-2 border-highlight/40 border-b bg-dark/90 z-50 flex items-center justify-end py-2 px-4 text-primary shrink-0">
                    {parent && 
                    (<>
                        <div className="px-3 py-1 border-highlight border-l"><a href={`/boards/${parent.id}`}>{`${parent.title}`}</a></div>
                        <div className="px-3 py-1">/</div>

                    </>
                    )}

                    {!readonly ? (
                            <input
                                type="text"
                                value={title}
                                onFocus={() => editor?.setIsEditingText(true)}
                                onBlur={handleTitleBlur}
                                onKeyDown={handleTitleKeyDown}
                                onChange={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (!setTitle) return;
                                setTitle(e.target.value);
                                }}
                                placeholder="Title"
                                className={`px-3 py-1 border-highlight ${
                                parent ? "border-r" : "border-x"
                                } focus:bg-highlight/30 outline-none bg-transparent`}
                            />
                            ) : (
                            <div
                                className={`px-3 py-1 border-highlight ${
                                parent ? "border-r" : "border-x"
                                } text-primary select-text`}
                            >
                                {title || "Untitled"}
                            </div>
                            )}

                    <button 
                        onClick={() => setScale(s => Math.max(s * 0.8, 0.1))} 
                        className="px-3 py-1   rounded hover:cursor-pointer bg-highlight/50 hover:bg-highlight/30"
                    >
                        −
                    </button>
                    <span className="px-3 py-1 rounded hover:cursor-pointer">
                        {(scale * 100).toFixed(0)}%
                    </span>
                    <button 
                        onClick={() => setScale(s => Math.min(s * 1.2, 5))} 
                        className="px-3 py-1  rounded hover:cursor-pointer bg-highlight/50 hover:bg-highlight/30"
                    >
                        +
                    </button>

                    {!readonly && setThemeModalOpen &&(<button 
                        onClick={() => { setThemeModalOpen(true) }} 
                        className="px-3 py-1 rounded hover:cursor-pointer bg-highlight/50 hover:bg-highlight/30"
                    >
                        Theme
                    </button>)}
                    {!readonly && setHelpModalOpen && (
                        <button
                        onClick={() => setHelpModalOpen(true)}
                        className="px-3 py-1 rounded hover:cursor-pointer bg-highlight/50 hover:bg-highlight/30"
                    >
                        Help
                    </button>
                    )}
                    {!readonly && setShareModalOpen && (
<button
                        onClick={() => setShareModalOpen(true)}
                        className="px-3 relative group py-1 rounded hover:cursor-pointer bg-highlight/50 hover:bg-highlight/30"
                    >
                        <Share size={18}/>
                                                <span
                className="
                pointer-events-none
                absolute
                top-full left-1/2 -translate-x-1/2 translate-y-2
                whitespace-nowrap
                rounded-md
                bg-white/90
                px-2 py-1
                text-xs text-black
                opacity-0
                scale-95
                transition-all
                group-hover:opacity-100
                group-hover:scale-100
                "
            >
  <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-4 border-transparent border-b-white/90" />

                Share 
                        
                        </span>
                    </button>
                    )}
                    {!readonly && handleExportPDF &&(
                        <button
                        onClick={handleExportPDF}
                        className="relative group px-3 py-1 rounded hover:cursor-pointer bg-highlight/50 hover:bg-highlight/30"
                    >
                        <Download size={18}/>
                        <span
                className="
                pointer-events-none
                absolute
                top-full left-1/2 -translate-x-1/2 translate-y-2
                whitespace-nowrap
                rounded-md
                bg-white/90
                px-2 py-1
                text-xs text-black
                opacity-0
                scale-95
                transition-all
                group-hover:opacity-100
                group-hover:scale-100
                "
            >
  <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-0 h-0 border-4 border-transparent border-b-white/90" />

                Export 
                        
                        </span>
                    </button>
                    )}
                    
                </div>)
}