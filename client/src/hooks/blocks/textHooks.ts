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

export const TEXT_SIZES = [
  { label: '8', value: '8px' },
  { label: '9', value: '9px' },
  { label: '10', value: '10px' },
  { label: '11', value: '11px' },
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '24', value: '24px' },
  { label: '30', value: '30px' },
  { label: '36', value: '36px' },
  { label: '48', value: '48px' },
];

export const COLORS = [
  { label: 'Black', value: '#000000' },
  { label: 'Dark Gray', value: '#444444' },
  { label: 'Gray', value: '#888888' },
  { label: 'Red', value: '#e74c3c' },
  { label: 'Orange', value: '#e67e22' },
  { label: 'Yellow', value: '#f39c12' },
  { label: 'Green', value: '#27ae60' },
  { label: 'Blue', value: '#3498db' },
  { label: 'Purple', value: '#9b59b6' },
  { label: 'White', value: '#ffffff' },
];

export const HIGHLIGHTS = [
  { label: 'None', value: null },
  { label: 'Yellow', value: '#fff59d' },
  { label: 'Green', value: '#c5e1a5' },
  { label: 'Blue', value: '#90caf9' },
  { label: 'Red', value: '#ef9a9a' },
  { label: 'Purple', value: '#ce93d8' },
  { label: 'Orange', value: '#ffcc80' },
];
