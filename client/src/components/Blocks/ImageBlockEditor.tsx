import { useEffect, useState } from "react";
import { useData } from "@/context/data";
import { useEditor } from "@/context/editor";
import { compileStyle } from "@/hooks/blocks/imageHooks";
import type { ImageBlockType, Location } from "@/types/types";

type Props = ImageBlockType & {
  dims: Location;
};

export default function ImageBlockEditor({ id, content, dims }: Props) {
  const { updateBlock } = useData();
  const { setIsEditingText } = useEditor();

  const [title, setTitle] = useState(content.title);

  useEffect(() => {
    setTitle(content.title);
  }, [content.title]);

  const { containerStyle } = compileStyle(
    content.transforms,
    content,
    { width: dims.width, height: dims.height }
  );

  const handleTitleBlur = async () => {
    await updateBlock(id, {
      content: { title: title.trim() }
    });
    setIsEditingText(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") {
      setTitle(content.title);
      e.currentTarget.blur();
    }
  };

  return (
    <>
      <div
        className="relative overflow-hidden w-full h-full"
        style={containerStyle}
      />

      
    </>
  );
}
