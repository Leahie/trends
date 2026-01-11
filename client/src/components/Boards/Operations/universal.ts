import { AlignLeft, AlignCenter, AlignRight, BringToFront } from "lucide-react";
import type { Operation } from "@/types/editorTypes";

export const UNIVERSAL_OPERATIONS : Operation[] = [
    {
        id: "align-left", 
        label: "Align Left", 
        icon: AlignLeft, 
        blockTypes: ["text", "image", "board_block"], 
        category: "universal",
        group: 'alignment',
        priority: 1,
        multiSelection: true,

        apply: (block, params) => ({
            location: {...block.location, x:params}
        })
    },
    {
        id: "align-center",
        label: "Align Center",
        icon: AlignCenter,
        blockTypes: ["text", "image", "board_block"],
        category: "universal",
        group: 'alignment',
        priority: 1,
        multiSelection: true,

        apply: (block, params) => ({
        location: {
            ...block.location,
            x: params - block.location.width/2
        }
        })
    },
    {
        id: "align-right",
        label: "Align Right",
        icon: AlignRight,
        blockTypes: ["text", "image", "board_block"],
        category: "universal",
        group: 'alignment',
        priority: 1,
        multiSelection: true,

        apply: (block, params) => ({
        location: {
            ...block.location,
            x: params- block.location.width
        }
        })
    },

]