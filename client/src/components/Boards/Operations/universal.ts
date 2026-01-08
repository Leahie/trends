import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import type { Operation } from "@/types/editorTypes";

export const UNIVERSAL_OPERATIONS : Operation[] = [
    {
        id: "align-left", 
        label: "Align Left", 
        icon: AlignLeft, 
        blockTypes: ["text", "image", "board_block"], 
        category: "universal",
        apply: (block) => ({
            location: {...block.location, x:0}
        })
    },
    {
        id: "align-center",
        label: "Align Center",
        icon: AlignCenter,
        blockTypes: ["text", "image", "board_block"],
        category: "universal",
        apply: (block) => ({
        location: {
            ...block.location,
            x: (4000 - block.location.width) / 2
        }
        })
    },
    {
        id: "align-center",
        label: "Align Center",
        icon: AlignRight,
        blockTypes: ["text", "image", "board_block"],
        category: "universal",
        apply: (block) => ({
        location: {
            ...block.location,
            x: 4000 - block.location.width
        }
        })
    }


]