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

      {content.subtitle && (
        <div
          className="absolute left-0 right-0 bg-dark/90 text-white text-xs px-2 py-1 text-center"
          style={{ top: "100%", marginTop: "2px", backdropFilter: "blur(4px)" }}
        >
          <input
            value={title}
            onFocus={() => setIsEditingText(true)}
            onChange={(e) => {
              setIsEditingText(true);
              setTitle(e.target.value);
            }}
            onBlur={handleTitleBlur}
            onKeyDown={handleKeyDown}
            className="bg-highlight text-xl font-semibold pl-4 py-1 text-left outline-none w-full"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
