import type { TextBlockType, Location } from "@/types/types";
import TextBlockView from "./TextBlockView";
import TextBlockEditor from "./TextBlockEditor";

type Props = TextBlockType & {
  dims: Location;
  readOnly?: boolean;
};

export default function TextBlock(props: Props) {
  if (props.readOnly) {
    return <TextBlockView {...props} />;
  }
  return <TextBlockEditor {...props} />;
}
