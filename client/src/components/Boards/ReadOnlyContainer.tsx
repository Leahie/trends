import type { BaseBlock, BoardBlockType, ImageBlockType, TextBlockType,  } from "@/types/types";
import BoardBlock from "@/components/Blocks/BoardBlock";
import ImageBlock from "@/components/Blocks/ImageBlock";
import TextBlock from "@/components/Blocks/TextBlock";

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