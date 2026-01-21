import type { ImageBlockType, Location } from "@/types/types";
import ImageBlockView from "./ImageBlockView";
import ImageBlockEditor from "./ImageBlockEditor";

type Props = ImageBlockType & {
  dims: Location;
  readOnly?: boolean;
};

export default function ImageBlock(props: Props) {
  if (props.readOnly) {
    return <ImageBlockView {...props} />;
  }
  return <ImageBlockEditor {...props} />;
}
