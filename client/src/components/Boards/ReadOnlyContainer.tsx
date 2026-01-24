import type { BaseBlock, BoardBlockType, ImageBlockType, TextBlockType,  } from "@/types/types";
import BoardBlock from "../Blocks/Boards/BoardBlock";
import ImageBlock from "../Blocks/Image/ImageBlock";
import TextBlock from "../Blocks/Text/TextBlock";

interface ContainerProps{
  node: BaseBlock,
  dims: any,
  readOnly?: boolean,
  onBoardClick?: (linkedBoardId: string) => void;
}

export default function ReadOnlyContainer({node, dims, readOnly = false, onBoardClick} : ContainerProps){
    return(
      <div className="h-full w-full">
        {node.type === 'text' && (
          <TextBlock 
            {...(node as TextBlockType)}
            dims={dims}
            readOnly={readOnly}
          />
        )}

        {node.type == 'image' && (
          <ImageBlock 
            {...(node as ImageBlockType)}
            dims={dims}
            readOnly={readOnly}
          />
        )}

        {node.type == 'board_block' && (
          <BoardBlock 
            {...(node as BoardBlockType)}
            dims={dims}
            readOnly={readOnly}
            onOpen={onBoardClick}
          />
        )}

      </div>

    )

}