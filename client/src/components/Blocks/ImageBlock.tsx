import { compileStyle } from "@/hooks/blocks/imageHooks";
import type {ImageBlockType, Location} from "@/types/types"

type ImageBlockProps = ImageBlockType & {
  dims: Location;
};

export default function ImageBlock({id, type, content, location, boardId, dims}: ImageBlockProps){
    const { containerStyle } = compileStyle(
        content.transforms, 
        content, 
        { width: dims.width, height: dims.height }
    );

    return( 
        <div 
            className="h-full w-full relative overflow-hidden"
            style={containerStyle}
        />
    )
}