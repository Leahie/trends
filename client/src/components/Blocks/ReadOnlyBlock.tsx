// components/ReadOnlyBlock.tsx
import type { Block, Location } from "@/types/types";
import Container from "../Boards/Container";
import { generateScheme, schemeToCSSVars } from "@/utils/theme";

export default function ReadOnlyBlock({ 
    node, 
    scale = 1 
}: { 
    node: Block; 
    scale?: number;
}) {
    if (!node) return null;

    const boxStyle = {
        width: `${node.location.width}px`,
        height: `${node.location.height}px`,
        top: `${node.location.y}px`,
        left: `${node.location.x}px`,
        zIndex: node.location.zIndex,
        overflow: "hidden",
        userSelect: "none" as const,
        position: "absolute" as const,
    };

    const scheme = node.type === "text" && node.content.bgColor 
        ? generateScheme(node.content.bgColor) 
        : null;
    
    const blockTheme = scheme ? schemeToCSSVars(scheme) : undefined;

    return (
        <div 
            className={`absolute ${node.type === "text" && "text-block"}`}
            style={{ ...boxStyle, ...blockTheme }}
        >
            <div className="absolute inset-0">
                <Container node={node} dims={node.location} scale={scale} />
            </div>
        </div>
    );
}