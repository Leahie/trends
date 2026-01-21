import { compileStyle } from "@/hooks/blocks/imageHooks";
import type { ImageBlockType, Location } from "@/types/types";

type Props = ImageBlockType & {
  dims: Location;
};

export default function ImageBlockView({ content, dims }: Props) {
  const { containerStyle } = compileStyle(
    content.transforms,
    content,
    { width: dims.width, height: dims.height }
  );

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
          <span className="text-xl font-semibold pl-4 py-1 text-left w-full block">
            {content.subtitle}
          </span>
        </div>
      )}
    </>
  );
}
