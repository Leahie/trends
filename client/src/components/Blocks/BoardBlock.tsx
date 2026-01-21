import type { BoardBlockType, Location } from "@/types/types";
import BoardBlockView from "./BoardBlockView";
import BoardBlockEditor from "./BoardBlockEditor";

type Props = BoardBlockType & {
  dims: Location;
  readOnly?: boolean;

  // drag & drop (editor only)
  isDropTarget?: boolean;
  onDrop?: () => void;

  // navigation
  onOpen?: (linkedBoardId: string) => void;
};

export default function BoardBlock(props: Props) {
  if (props.readOnly) return <BoardBlockView {...props} />;
  return <BoardBlockEditor {...props} />;
}
