// components/ReadOnlyBlock.tsx
import type { Block } from "@/types/types";
import Container from "../Boards/Container";
import { generateScheme, schemeToCSSVars } from "@/utils/theme";

export default function ReadOnlyBlock({ 
    node
}: { 
    node: Block;
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
                <Container node={node} dims={node.location} />
            </div>
        </div>
    );
}