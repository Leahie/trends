import type { Block, ImageTransforms, Location } from "@/types/types";
import type { RefObject } from "react";

//Compile the style object for an image using background-image approach
export function compileStyle(
    transforms: ImageTransforms | undefined,
    content: any,
    containerSize: { width: number; height: number }
): { containerStyle: React.CSSProperties } {
    const containerStyle: React.CSSProperties = {
        backgroundImage: `url("${encodeURI(content.url)}")`,
        backgroundRepeat: 'no-repeat',
    };

    // Filters
    const filterParts: string[] = [];
    
    if (transforms?.grayscale) filterParts.push("grayscale(100%)");
    if (typeof transforms?.brightness === "number") {
        filterParts.push(`brightness(${100 + transforms.brightness}%)`);
    }
    if (typeof transforms?.contrast === "number") {
        filterParts.push(`contrast(${100 + transforms.contrast}%)`);
    }
    if (typeof transforms?.saturation === "number") {
        filterParts.push(`saturate(${100 + transforms.saturation}%)`);
    }
    if (typeof transforms?.opacity === "number") {
        containerStyle.opacity = transforms.opacity;
    }
    if (filterParts.length) {
        containerStyle.filter = filterParts.join(" ");
    }

    // Transforms (flip/rotation via CSS transform)
    const transformParts: string[] = [];
    
    if (transforms?.flip?.horizontal) transformParts.push("scaleX(-1)");
    if (transforms?.flip?.vertical) transformParts.push("scaleY(-1)");
    if (typeof transforms?.rotation === "number") {
        transformParts.push(`rotate(${transforms.rotation}deg)`);
    }
    if (transformParts.length) {
        containerStyle.transform = transformParts.join(" ");
    }

    if (transforms?.crop) {
        const { xRatio, yRatio, widthRatio, heightRatio } = transforms.crop;
        
        const bgWidthPercent = (1 / widthRatio) * 100;
        const bgHeightPercent = (1 / heightRatio) * 100;

        const posXPercent = (xRatio / (1 - widthRatio)) * 100;
        const posYPercent = (yRatio / (1 - heightRatio)) * 100;

        containerStyle.backgroundSize = `${bgWidthPercent}% ${bgHeightPercent}%`;
        containerStyle.backgroundPosition = `${posXPercent}% ${posYPercent}%`;        
    } else {
        // No crop - standard background-size: cover
        containerStyle.backgroundSize = 'cover';
        containerStyle.backgroundPosition = 'center';
    }

    return { containerStyle };
}

//Zooms a block to fit the canvas viewport.
export function zoomToBlock(
  canvasRef: RefObject<HTMLDivElement | null>,
  block: Block,
  setScale: (s: number) => void,
  setPan: (p: { x: number; y: number }) => void
) {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const canvasWidth = rect.width;
  const canvasHeight = rect.height;

  const blockWidth = block.location.width * block.location.scaleX;
  const blockHeight = block.location.height * block.location.scaleY;

  const scaleX = canvasWidth / blockWidth;
  const scaleY = canvasHeight / blockHeight;

  const newScale = Math.min(scaleX, scaleY);

  const newPanX = canvasWidth / 2 - (block.location.x + blockWidth / 2) * newScale;
  const newPanY = canvasHeight / 2 - (block.location.y + blockHeight / 2) * newScale;

  setScale(newScale);
  setPan({ x: newPanX, y: newPanY });
}