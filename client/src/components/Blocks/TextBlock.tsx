// Really complicated but kind of needed for slate, whenever I do marks it has to be in the file
import { useData } from "@/context/data";
import { useEditor } from "@/context/editor";
import { createEditor, Editor, Transforms, Element as SlateElement } from "slate";
import type {Descendant} from "slate";
import {Slate, useSlate, withReact, ReactEditor, Editable} from "slate-react"
import type {TextBlockType} from "@/types/types"
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { parseBodyContent, serializeSlateContent, TEXT_SIZES } from "@/hooks/blocks/textHooks";
import { withHistory } from "slate-history";
import { HexColorPicker } from "react-colorful";

import { 
  Bold, Italic, Underline, Code, 
  Heading1, Heading2, Quote, 
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, 
  Type, Highlighter, Palette
} from "lucide-react";
import { generateScheme, schemeToCSSVars } from "@/utils/theme";


const getMarkValue = (editor: Editor, format: string) => {
    const marks = Editor.marks(editor) as any;
    return marks ? marks[format] : undefined;
};

const toggleMark = (editor: Editor, format: string) => {
        const isActive = isMarkActive(editor, format);
        if (isActive) {
            Editor.removeMark(editor, format);
        } else {
            Editor.addMark(editor, format, true);
        }
    };

    const isMarkActive = (editor: Editor, format: string) => {
        const marks = Editor.marks(editor) as any;
        return marks ? marks[format] === true : false;
    };

    const toggleBlock = (editor: Editor, format: string) => {
        const isActive = isBlockActive(editor, format, format.startsWith('align-') ? 'align' : 'type');
        const isList = ['numbered-list', 'bulleted-list'].includes(format);

        Transforms.unwrapNodes(editor, {
            match: n => 
            !Editor.isEditor(n) &&
            SlateElement.isElement(n) &&
            ['numbered-list', 'bulleted-list'].includes((n as any).type) &&
            !format.startsWith('align-'),
            split: true,
        });

        let newProperties: Partial<SlateElement>;
        
        if (format.startsWith('align-')) {
            const alignment = format.replace('align-', '');
            newProperties = { align: isActive ? undefined : alignment } as any;
        } else {
            newProperties = {
            type: isActive ? 'paragraph' : isList ? 'list-item' : format,
            } as any;
        }
        
        Transforms.setNodes<SlateElement>(editor, newProperties);

        if (!isActive && isList) {
            const block = { type: format, children: [] } as any;
            Transforms.wrapNodes(editor, block);
        }
    };

    const isBlockActive = (editor: Editor, format: string, blockType: 'type' | 'align' = 'type') => {
        const { selection } = editor;
        if (!selection) return false;

        const [match] = Array.from(
            Editor.nodes(editor, {
            at: Editor.unhangRange(editor, selection),
            match: n => {
                if (!Editor.isEditor(n) && SlateElement.isElement(n)) {
                if (blockType === 'align') {
                    const alignment = format.replace('align-', '');
                    return (n as any).align === alignment;
                }
                return (n as any).type === format;
                }
                return false;
            },
            })
        );

        return !!match;
    };

function ToolbarButton({ 
    format, 
    icon: Icon, 
    isBlock = false 
    }: { 
    format: string; 
    icon: any; 
    isBlock?: boolean;
    }) {
    const editor = useSlate();
    const isActive = isBlock 
        ? isBlockActive(editor, format, format.startsWith('align-') ? 'align' : 'type')
        : isMarkActive(editor, format);

    return (
        <button
        onMouseDown={(e) => {
            e.preventDefault();
            if (isBlock) {
            toggleBlock(editor, format);
            } else {
            toggleMark(editor, format);
            }
        }}
        className={`p-2 rounded transition-colors ${
            isActive 
            ? 'bg-dark text-white' 
            : 'hover:bg-dark/50 text-body'
        }`}
        >
        <Icon size={16} />
        </button>
    );
}

function FontSizeDropdown({ toolbarPosition }: { toolbarPosition: 'top' | 'bottom' }) {
    const editor = useSlate();
    const currentSize = getMarkValue(editor, 'fontSize') || '15px';
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onMouseDown={(e) => {
                    e.preventDefault();
                    setIsOpen(!isOpen);
                }}
                className="px-2 py-2 rounded transition-colors hover:bg-dark/50 text-body flex items-center gap-1 "
            >
                <span className="text-[13px] font-mono">{currentSize.replace('px', '')}</span>
            </button>
            
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsOpen(false)}
                    />
                    <div className={`absolute ${toolbarPosition === 'top' ? 'bottom-full mb-4' : 'top-full mt-4'} left-0 bg-dark border border-gray-600 rounded shadow-lg z-20 max-h-[200px] overflow-y-auto`}
                    onWheel={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}>
                        {TEXT_SIZES.map((size) => (
                            <button
                                key={size.value}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    Editor.addMark(editor, 'fontSize', size.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 hover:bg-highlight transition-colors whitespace-nowrap ${
                                    currentSize === size.value ? 'bg-highlight text-white' : 'text-body'
                                }`}
                            >
                                <span className="font-mono">{size.label}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function ColorPicker({ type = 'color', toolbarPosition }: { type?: 'color' | 'highlight'; toolbarPosition: 'top' | 'bottom' }) {
    const editor = useSlate();
    const [lastColor, setLastColor] = useState("#FFFFFF");
    const [isOpen, setIsOpen] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    const markName = type === 'color' ? 'color' : 'backgroundColor';
    const currentValue = getMarkValue(editor, markName) || lastColor;
    const Icon = type === 'color' ? Palette : Highlighter;

    // Smart positioning for color picker
    const [pickerPosition, setPickerPosition] = useState<'left' | 'right'>('left');

    useEffect(() => {
        if (isOpen && pickerRef.current) {
            const rect = pickerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            
            // If picker would go off right edge, position it to the right
            if (rect.right > viewportWidth - 20) {
                setPickerPosition('right');
            } else {
                setPickerPosition('left');
            }
        }
    }, [isOpen]);

    return (
        <div className="relative">
        <button
            onMouseDown={(e) => {
            e.preventDefault();
            setIsOpen(v => !v);
            }}
            className="p-2 rounded hover:bg-dark/50 text-body relative"
        >
            <Icon size={16} />
            <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 rounded"
            style={{ backgroundColor: currentValue }}
            />
        </button>

        {isOpen && (
            <>
            <div className="fixed inset-0 z-10" onMouseDown={() => setIsOpen(false)} />

            <div 
                ref={pickerRef}
                className={`absolute ${toolbarPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} ${pickerPosition === 'right' ? 'right-0' : 'left-0'} bg-dark border border-gray-600 rounded-xl shadow-lg z-20 p-3`}
            >
                <HexColorPicker
                color={currentValue}
                onChange={(color) => {
                    setLastColor(color);
                    Editor.addMark(editor, markName, color);
                }}
                />

                <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-400">{currentValue}</span>
                <button
                    onMouseDown={(e) => {
                    e.preventDefault();
                    Editor.removeMark(editor, markName);
                    }}
                    className="text-xs text-red-400 hover:underline"
                >
                    Clear
                </button>
                </div>
            </div>
            </>
        )}
    </div>
  );
}


export default function TextBlock({id, type, content, boardId}: TextBlockType){
    const {isEditingText, setIsEditingText, editingBlockId, setEditingBlockId} = useEditor();
    
    const {updateBlock, isSyncing} = useData();
    const [title, setTitle] = useState<string>(content.title);
    const [isSaving, setIsSaving] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [toolbarPosition, setToolbarPosition] = useState<'top' | 'bottom'>('top');
    

    const isThisBlockEditing = isEditingText && editingBlockId === id;

    const editor = useMemo(()=> withHistory(withReact(createEditor())), []);
    const [value, setValue] = useState<Descendant[]>(() => parseBodyContent(content.body))

    // Calculate optimal toolbar position
    useEffect(() => {
        if (!isThisBlockEditing || !containerRef.current) return;

        const updatePosition = () => {
            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const toolbarHeight = 60; // Approximate toolbar height
            const spaceAbove = rect.top;
            const spaceBelow = viewportHeight - rect.bottom;


            if (spaceAbove < toolbarHeight + 20 && spaceBelow > spaceAbove) {
                setToolbarPosition('bottom');
            } else {
                setToolbarPosition('top');
            }
        };

        updatePosition();
        
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isThisBlockEditing]);

    const handleBlur = useCallback(() => {
        const latestValue = editor.children as Descendant[];
        const serialized = serializeSlateContent(latestValue);
      
        setIsSaving(true);
        setIsEditingText(false);
        setEditingBlockId(null);
                
        updateBlock(id, {
            content: {
                ...content,
                title: title, 
                body: serialized
            }
        });
    }, [value, title, id, content, updateBlock, setIsEditingText, setEditingBlockId]);

    useEffect(() => {
        if (!isThisBlockEditing) {
            setValue(parseBodyContent(content.body));
        }
    }, [content.body, isThisBlockEditing]);
    
    useEffect(() => {
        if (!isSyncing && isSaving) {
            setIsSaving(false);
        }
        }, [isSyncing, isSaving]);
    
    

    useEffect(() => {
  if (!isThisBlockEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
        if (!containerRef.current?.contains(event.target as Node)) {
        handleBlur();
        }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isThisBlockEditing, handleBlur]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (title !== content.title && isThisBlockEditing) {
                updateBlock(id, {
                    content: {
                        ...content,
                        title: title
                    }
                });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [title, content.title, isThisBlockEditing]);
    
    
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            ReactEditor.blur(editor);
            handleBlur();
        }
        
        if (e.key === ' ') {
            e.stopPropagation();
        }
    }, [editor, handleBlur]);

    // renders
    const renderLeaf = useCallback((props: any) => {
        let { attributes, children, leaf } = props;
        
        if (leaf.bold) {
            children = <strong>{children}</strong>;
        }
        if (leaf.italic) {
            children = <em>{children}</em>;
        }
        if (leaf.underline) {
            children = <u>{children}</u>;
        }
        if (leaf.code) {
            children = <code className="bg-gray-800 px-1 rounded">{children}</code>;
        }
        const style: React.CSSProperties = {};
        if (leaf.fontSize) {
            style.fontSize = leaf.fontSize;
        }
        if (leaf.color) {
            style.color = leaf.color;
        }
        if (leaf.backgroundColor) {
            style.backgroundColor = leaf.backgroundColor;
        }
        
        return <span {...attributes} style={style}>{children}</span>;
    }, []);

    const renderElement = useCallback((props: any) => {
        const { attributes, children, element } = props;
        const style: React.CSSProperties = {};
        
        if ('align' in element) {
            style.textAlign = element.align;
        }
        
        switch (element.type) {
            case 'paragraph':
                return <p {...attributes} style={style}>{children}</p>;
            case 'heading-one':
                return <h1 {...attributes} style={style} className="text-2xl font-bold">{children}</h1>;
            case 'heading-two':
                return <h2 {...attributes} style={style} className="text-xl font-bold">{children}</h2>;
            case 'block-quote':
                return <blockquote {...attributes} style={style} className="border-l-4 border-gray-500 pl-4 italic">{children}</blockquote>;
            case 'bulleted-list':
                return <ul {...attributes} style={style} className="list-disc ml-6">{children}</ul>;
            case 'numbered-list':
                return <ol {...attributes} style={style} className="list-decimal ml-6">{children}</ol>;
            case 'list-item':
                return <li {...attributes} style={style}>{children}</li>;
            default:
                return <p {...attributes} style={style}>{children}</p>;
        }
    }, []);

    const renderFormattedContent = useCallback(() => {
        return value.map((node, i) => {
            if (SlateElement.isElement(node)) {
                const text = node.children.map((child, j) => {
                    if ('text' in child) {
                        let content = child.text;
                        const style: React.CSSProperties = {};
                        
                        if (child.fontSize) {
                            style.fontSize = child.fontSize;
                        }
                        if (child.color) {
                            style.color = child.color;
                        }
                        if (child.backgroundColor) {
                            style.backgroundColor = child.backgroundColor;
                        }

                        let element = <span key={j} style={style}>{content}</span>;
                        
                        if (child.bold) {
                            element = <strong key={j} style={style}>{content}</strong>;
                        }
                        if (child.italic) {
                            element = <em key={j} style={style}>{element}</em>;
                        }
                        if (child.underline) {
                            element = <u key={j} style={style}>{element}</u>;
                        }
                        if (child.code) {
                            element = <code key={j} style={style} className="bg-gray-800 px-1 rounded">{content}</code>;
                        }
                        
                        return element;
                    }
                    return null;
                });
                
                const style: React.CSSProperties = {};
                if ('align' in node) {
                    style.textAlign = node.align as any;
                }
                
                switch (node.type) {
                    case 'heading-one':
                        return <h1 key={i} style={style} className="text-2xl font-bold">{text}</h1>;
                    case 'heading-two':
                        return <h2 key={i} style={style} className="text-xl font-bold">{text}</h2>;
                    case 'block-quote':
                        return <blockquote key={i} style={style} className="border-l-4 border-gray-500 pl-4 italic">{text}</blockquote>;
                    case 'bulleted-list':
                        return <ul key={i} style={style} className="list-disc ml-6">{text}</ul>;
                    case 'numbered-list':
                        return <ol key={i} style={style} className="list-decimal ml-6">{text}</ol>;
                    case 'list-item':
                        return <li key={i} style={style}>{text}</li>;
                    default:
                        return <p key={i} style={style}>{text}</p>;
                }
            }
            return null;
        });
    }, [value]);

    const scheme = content.bgColor ? generateScheme(content.bgColor) : null;

    const blockTheme = scheme ? schemeToCSSVars(scheme) : undefined;

    return(    
        <>
                {(isThisBlockEditing && !isSaving)  ? (
                    <div 
                    className="relative bg-highlight h-full w-full flex flex-col text-left border-x-4 border-b-8 border-dark"
                    ref = {containerRef}
                    style={blockTheme}
                        >
                    <Slate 
                        editor={editor} 
                        initialValue={value}
                        onChange={newValue => setValue(newValue)}
                    >
                    {/* Smart positioned toolbar */}
                    <div 
                        ref={toolbarRef}
                        className={`absolute ${
                            toolbarPosition === 'top' 
                                ? '-top-3 -translate-y-full' 
                                : '-bottom-3 translate-y-full'
                        } left-1/2 -translate-x-1/2 w-full max-w-[600px] bg-accent border border-dark px-3 py-2 flex gap-1 items-center flex-wrap rounded-xl shadow-xl z-50`}
                    >
                        <ToolbarButton format="bold" icon={Bold} />
                        <ToolbarButton format="italic" icon={Italic} />
                        <ToolbarButton format="underline" icon={Underline} />
                        <ToolbarButton format="code" icon={Code} />
                        
                        <div className="w-px h-6 bg-dark mx-1" />

                        <FontSizeDropdown toolbarPosition={toolbarPosition} />
                        <ColorPicker type="color" toolbarPosition={toolbarPosition} />
                        <ColorPicker type="highlight" toolbarPosition={toolbarPosition} />

                            <div className="w-px h-6 bg-dark mx-1" />

                        
                        <ToolbarButton format="heading-one" icon={Heading1} isBlock />
                        <ToolbarButton format="heading-two" icon={Heading2} isBlock />
                        <ToolbarButton format="block-quote" icon={Quote} isBlock />
                        
                        <div className="w-px h-6 bg-dark mx-1" />
                        
                        <ToolbarButton format="bulleted-list" icon={List} isBlock />
                        <ToolbarButton format="numbered-list" icon={ListOrdered} isBlock />
                        
                        <div className="w-px h-6 bg-dark mx-1" />
                        
                        <ToolbarButton format="align-left" icon={AlignLeft} isBlock />
                        <ToolbarButton format="align-center" icon={AlignCenter} isBlock />
                        <ToolbarButton format="align-right" icon={AlignRight} isBlock />
                    </div>
                    
                    <Editable
                        className="text-body text-[15px] flex-1 outline-none m-5"
                        renderLeaf={renderLeaf}
                        renderElement={renderElement}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        placeholder="Start typing..."
                        spellCheck
                    />
                </Slate>
                        <div className="bg-accent border-t border-dark px-5 py-2">
                            <input 
                                type="text"
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => e.key === ' ' && e.stopPropagation()}
                                placeholder="Title"
                                className="w-full bg-transparent outline-none font-bold text-[10px] text-light-accent leading-6"
                            />
                        </div> 
                    </div>

                    ) : (
                        <div className="relative bg-highlight p-5 h-full w-full flex flex-col text-left border-x-4 border-b-8 border-dark"
                        style={blockTheme}> 
                        
                        {isSaving && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-20 flex items-center justify-center">
                            <div className="flex items-center gap-2 text-xs text-white font-medium">
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving…
                            </div>
                            </div>
                        )}
                        <div className="text-body text-[15px] flex-1 overflow-hidden p-5">
                            {renderFormattedContent()}
                        </div>
                                       
                        <h5 className="font-bold px-5 pb-3 text-[10px] text-light-accent leading-8 flex-shrink-0">{content.title}</h5>
                        </div>
                        
                    )}

        </>
    )
}