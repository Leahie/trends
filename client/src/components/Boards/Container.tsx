import type { BaseBlock, BoardBlockType, ImageBlockType, TextBlockType } from "@/types/types";
import BoardBlock from "@/components/Blocks/BoardBlock";
import ImageBlock from "@/components/Blocks/ImageBlock";
import TextBlock from "@/components/Blocks/TextBlock";
import { useEditor } from "@/context/editor";

interface ContainerProps {
  node: BaseBlock;
  dims: any;

  // shared view
  readOnly?: boolean;
  onBoardClick?: (linkedBoardId: string) => void;

  // drag & drop (editor)
  isDropTarget?: boolean;
  onBoardBlockDrop?: () => void;
  isDraggingOverBoard?: boolean;
}

export default function Container({
  node,
  dims,
  readOnly = false,
  onBoardClick,
  isDropTarget,
  onBoardBlockDrop,
  isDraggingOverBoard,
}: ContainerProps) {

  const { selectedBlockIds } = useEditor();

  return (
    <div
      className={`h-full w-full ${
        isDraggingOverBoard && selectedBlockIds.includes(node.id)
          ? "opacity-50"
          : ""
      }`}
    >
      {node.type === "text" && (
        <TextBlock
          {...(node as TextBlockType)}
          dims={dims}
          readOnly={readOnly}
        />
      )}

      {node.type === "image" && (
        <ImageBlock
          {...(node as ImageBlockType)}
          dims={dims}
          readOnly={readOnly}
        />
      )}

      {node.type === "board_block" && (
        <BoardBlock
          {...(node as BoardBlockType)}
          dims={dims}
          readOnly={readOnly}
          onOpen={onBoardClick}
          isDropTarget={isDropTarget}
          onDrop={onBoardBlockDrop}
        />
      )}
    </div>
  );
}
