import type {Descendant} from "slate"

export const parseBodyContent = (body: string): Descendant[] => {
    try {
        const parsed = JSON.parse(body);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed as Descendant[];
        }
    } catch (e) {
        // Not JSON, treat as plain text
    }
    
    return [
        {
            type: 'paragraph',
            children: [{ text: body || '' }],
        },
    ];
};

export const serializeSlateContent = (value: Descendant[]): string => {
    return JSON.stringify(value);
};

