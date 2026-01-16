import type { Board } from "@/types/types";

interface HeaderProps {
    parent:Board | null;
    title: string;
    scale: number;
    setPan: (arg0: {x:number, y: number}) => void;
    setTitle: React.Dispatch<React.SetStateAction<string>>;
    setScale: React.Dispatch<React.SetStateAction<number>>;
    setThemeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

    setShareModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    


}
export default function Header({parent, title, setTitle, setScale, scale, setPan, setThemeModalOpen, setShareModalOpen}: HeaderProps){
            console.log(parent)

                return (<div className="absolute top-0 w-full gap-2 border-highlight/40 border-b-1 bg-dark/90 z-50 flex justify-end  pt-2 pb-2 px-4 text-primary">
                    {parent && 
                    (<>
                        <div className="px-3 py-1 border-highlight border-l-1"><a href={`/boards/${parent.id}`}>{`${parent.title}`}</a></div>
                        <div className="px-3 py-1">/</div>

                    </>
                    )}

                    <input 
                        type="text"
                        value={title} 
                        onChange={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            return setTitle(e.target.value)}}
                        placeholder="Title"
                        className = {`px-3 py-1 border-highlight ${parent ? "border-r-1" : "border-x-1"} focus:bg-highlight/30 outline-none`}
                    />      
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
                    <button 
                        onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }} 
                        className="px-3 py-1   rounded hover:cursor-pointer bg-highlight/50 hover:bg-highlight/30"
                    >
                        Reset
                    </button>
                    <button 
                        onClick={() => { setThemeModalOpen(true) }} 
                        className="px-3 py-1 rounded hover:cursor-pointer bg-highlight/50 hover:bg-highlight/30"
                    >
                        Theme
                    </button>
                    <button
                        onClick={() => setShareModalOpen(true)}
                        className="px-3 py-1 rounded hover:cursor-pointer bg-highlight/50 hover:bg-highlight/30"
                    >
                        Share
                    </button>
                </div>)
}