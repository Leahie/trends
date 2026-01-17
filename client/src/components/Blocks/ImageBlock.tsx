import { useData } from "@/context/data";
import { useEditor } from "@/context/editor";
import { compileStyle } from "@/hooks/blocks/imageHooks";
import type {ImageBlockType, Location} from "@/types/types"
import { useState } from "react";

type ImageBlockProps = ImageBlockType & {
  dims: Location;
};

export default function ImageBlock({id, type, content, location, boardId, dims}: ImageBlockProps){
    const {updateBoard} = useData();
    const {setIsEditingText} = useEditor();
    const [title, setTitle] = useState(content.title);
    const { containerStyle } = compileStyle(
        content.transforms, 
        content, 
        { width: dims.width, height: dims.height }
    );

    const handleTitleBlur = async () => {
        if (title.trim() && title !== content.title) 
            await updateBoard(id, { title: title });
            setIsEditingText(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
            setTitle(title);
            
        }
    };

    return( 
        <>
            <div 
                className="relative overflow-hidden w-full h-full"
                style={containerStyle}
            />
            {content.subtitle && (
                <div className="absolute left-0 right-0 bg-dark/90 text-white text-xs px-2 py-1 text-center"
                     style={{ 
                         top: '100%',
                         marginTop: '2px',
                         backdropFilter: 'blur(4px)'
                     }}>
                    <input
                        type="text"
                        value={title}
                        onFocus={() => setIsEditingText(true)}
                        onChange={(e) => {setIsEditingText(true) ;setTitle(e.target.value)}}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        
                        className="
                            bg-highlight
                            text-xl
                            font-semibold
                            pl-4
                            py-1
                            text-left
                            outline-none
                            w-full
                        "
                       onMouseDown={(e) => e.stopPropagation()}
onClick={(e) => e.stopPropagation()}
onDoubleClick={(e) => e.stopPropagation()}

                    />
                </div>
            )}
        </>
        
    )
}