// Really complicated but kind of needed for slate, whenever I do marks it has to be in the file
import { useData } from "@/context/data";
import { useEditor } from "@/context/editor";
import { createEditor, Editor, Transforms, Element as SlateElement, Range } from "slate";
import type {Descendant} from "slate";
import {Slate, useSlate, withReact, ReactEditor, Editable} from "slate-react"
import type {TextBlockType,Location} from "@/types/types"
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { parseBodyContent, serializeSlateContent, TEXT_SIZES } from "@/hooks/blocks/textHooks";
import { withHistory } from "slate-history";
import { HexColorPicker } from "react-colorful";


import { 
  Bold, Italic, Underline, Code, 
  Heading1, Heading2, Quote, 
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, 
  Highlighter, Palette, Link as LinkIcon
} from "lucide-react";
import { generateScheme, schemeToCSSVars } from "@/utils/theme";

// Helper to check if URL is valid
// Unused: URL validation helper
/*
const _isUrl = (text: string) => {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
};
*/

// NOTE: withLinks is not currently used but kept for future link handling
/*
const withLinks = (editor: Editor) => {
  const { insertData, insertText, isInline } = editor as any;

  (editor as any).isInline = (element: any) => {
    return element.type === 'link' ? true : isInline(element);
  };

  (editor as any).insertText = (text: string) => {
    if (text && isUrl(text)) {
      wrapLink(editor, text);
    } else {
      insertText(text);
    }
  };

  (editor as any).insertData = (data: DataTransfer) => {
    const text = data.getData('text/plain');
    if (text && isUrl(text)) {
      wrapLink(editor, text);
    } else {
      insertData(data);
    }
  };

  return editor;
};
*/

const insertLink = (editor: Editor, url: string) => {
  if (editor.selection) {
    wrapLink(editor, url);
  }
};

const isLinkActive = (editor: Editor) => {
  const [link] = Editor.nodes(editor, {
    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
  });
  return !!link;
};

const unwrapLink = (editor: Editor) => {
  Transforms.unwrapNodes(editor, {
    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
  });
};

const wrapLink = (editor: Editor, url: string) => {
  if (isLinkActive(editor)) {
    unwrapLink(editor);
  }

  const { selection } = editor;
  const isCollapsed = selection && Range.isCollapsed(selection);
  const link = {
    type: 'link',
    url,
    children: isCollapsed ? [{ text: url }] : [],
  };

  if (isCollapsed) {
    Transforms.insertNodes(editor, link as any);
  } else {
    Transforms.wrapNodes(editor, link as any, { split: true });
    Transforms.collapse(editor, { edge: 'end' });
  }
};


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

function LinkButton() {
    const editor = useSlate();
    const [isOpen, setIsOpen] = useState(false);
    const [url, setUrl] = useState('');

    const handleInsertLink = () => {
        if (!url) return;
        insertLink(editor, url);
        setUrl('');
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onMouseDown={(e) => {
                    e.preventDefault();
                    if (isLinkActive(editor)) {
                        unwrapLink(editor);
                    } else {
                        setIsOpen(!isOpen);
                    }
                }}
                className={`p-2 rounded transition-colors ${
                    isLinkActive(editor)
                    ? 'bg-dark text-white'
                    : 'hover:bg-dark/50 text-body'
                }`}
            >
                <LinkIcon size={16} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full mt-2 left-0 bg-dark border border-gray-600 rounded shadow-lg z-20 p-3 min-w-75">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleInsertLink();
                                }
                            }}
                            placeholder="Enter URL..."
                            className="w-full bg-highlight text-white px-3 py-2 rounded border border-gray-600 outline-none focus:border-accent"
                            autoFocus
                        />
                        <button
                            onClick={handleInsertLink}
                            className="mt-2 w-full bg-accent text-white px-3 py-2 rounded hover:bg-accent/80"
                        >
                            Insert Link
                        </button>
                    </div>
                </>
            )}
        </div>
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
                    <div className={`absolute ${toolbarPosition === 'top' ? 'bottom-full mb-4' : 'top-full mt-4'} left-0 bg-dark border border-gray-600 rounded shadow-lg z-20 max-h-50 overflow-y-auto`}
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

type TextBlockProps = TextBlockType & {
    dims: Location;
};

export default function TextBlock({id, content, dims}: TextBlockProps){
    const {isEditingText, setIsEditingText, editingBlockId, setEditingBlockId} = useEditor();
    
    const {updateBlock, isSyncing, syncNow} = useData();
    const [title, setTitle] = useState<string>(content.title);
    const [isSaving, setIsSaving] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const [toolbarPosition, setToolbarPosition] = useState<'top' | 'bottom'>('top');
    

    const isThisBlockEditing = isEditingText && editingBlockId === id;

    const editor = useMemo(()=> withHistory(withReact(createEditor())), []);
    const [value, setValue] = useState<Descendant[]>(() => parseBodyContent(content.body))

    const fontSizeMultiplier = useMemo(() => {
        const avgDimension = (dims.width + dims.height) / 2;
        // Base: 200px = 1x, scales linearly
        return Math.max(0.5, Math.min(3, avgDimension / 200));
    }, [dims.width, dims.height]);

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

    const handleBlur = useCallback(async () => {
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
        await syncNow();
    }, [value, title, id, content, updateBlock, syncNow, setIsEditingText, setEditingBlockId]);

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

        if ((e.ctrlKey || e.metaKey) && e.type === 'click') {
            const [link] = Editor.nodes(editor, {
                match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as any).type === 'link',
            });
            
            if (link) {
                const url = (link[0] as any).url;
                window.open(url, '_blank');
                e.preventDefault();
                return;
            }
        }

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
        const { attributes, children, element } = props as { attributes: any; children: any; element: SlateElement & { align?: React.CSSProperties['textAlign']; url?: string; type?: string } };
        const style: React.CSSProperties = {};
        
        if (element.align) {
            style.textAlign = element.align;
        }
        
        switch (element.type) {
            case 'link':
                return (
                    <a
                        {...attributes}
                        href={element.url}
                        className="text-blue-400 underline cursor-pointer hover:text-blue-300"
                        onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                window.open(element.url, '_blank');
                            }
                        }}
                    >
                        {children}
                    </a>
                );
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
            return value.map((n, i) => renderNode(n, i));
    }, [value]);

    const renderNode = (node: Descendant, key: number | string) => {
        if (SlateElement.isElement(node)) {
            const element = node as SlateElement & { align?: React.CSSProperties['textAlign']; url?: string; type?: string };
            const children = element.children.map((n, i) => renderNode(n, i));

            const style: React.CSSProperties = {};
            if (element.align) style.textAlign = element.align;

            switch (element.type) {
            case 'link':
                return (
                    <a
                        key={key}
                        href={element.url}
                        className="text-blue-400 underline cursor-pointer hover:text-blue-300"
                        onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                window.open(element.url, '_blank');
                            }
                        }}
                    >
                        {children}
                    </a>
                );
            case 'numbered-list':
                return <ol key={key} style={style} className="list-decimal ml-6">{children}</ol>;
            case 'bulleted-list':
                return <ul key={key} style={style} className="list-disc ml-6">{children}</ul>;
            case 'list-item':
                return <li key={key}>{children}</li>;
            case 'heading-one':
                return <h1 key={key} style={style}>{children}</h1>;
            case 'heading-two':
                return <h2 key={key} style={style}>{children}</h2>;
            default:
                return <p key={key} style={style}>{children}</p>;
            }
        }

        // TEXT
        let content = node.text;
        const style: React.CSSProperties = {};
        const nodeWithMarks = node as any;
        
        if (nodeWithMarks.fontSize) {
            style.fontSize = nodeWithMarks.fontSize; 
        }
        if (nodeWithMarks.color) {
            style.color = nodeWithMarks.color;
        }
        if (nodeWithMarks.backgroundColor) {
            style.backgroundColor = nodeWithMarks.backgroundColor;
        }

        let el = <span key={key} style={style}>{content}</span>;

        if (nodeWithMarks.bold) el = <strong key={key}>{el}</strong>;
        if (nodeWithMarks.italic) el = <em key={key}>{el}</em>;
        if (nodeWithMarks.underline) el = <u key={key}>{el}</u>;
        if (nodeWithMarks.code) el = <code key={key}>{el}</code>;

        return el;
    };


    const scheme = content.bgColor ? generateScheme(content.bgColor) : null;

    const blockTheme = scheme ? schemeToCSSVars(scheme) : undefined;

    return(    
        <>
               {(isThisBlockEditing && !isSaving) ? (
                <div 
                    className="relative bg-highlight h-full w-full flex flex-col text-left border-x-4 border-b-8 border-dark"
                    ref={containerRef}
                    style={blockTheme}
                >
                    <Slate 
                        editor={editor} 
                        initialValue={value}
                        onChange={newValue => setValue(newValue)}
                    >
                        <div 
                            ref={toolbarRef}
                            className={`absolute ${
                                toolbarPosition === 'top' 
                                    ? '-top-3 -translate-y-full' 
                                    : '-bottom-3 translate-y-full'
                            } left-1/2 -translate-x-1/2 w-full max-w-150 bg-accent border border-dark px-3 py-2 flex gap-1 items-center flex-wrap rounded-xl shadow-xl z-50`}
                        >
                            <ToolbarButton format="bold" icon={Bold} />
                            <ToolbarButton format="italic" icon={Italic} />
                            <ToolbarButton format="underline" icon={Underline} />
                            <ToolbarButton format="code" icon={Code} />
                            
                            <div className="w-px h-6 bg-dark mx-1" />

                            <LinkButton />
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
                            className="text-body flex-1 outline-none m-5"
                            style={{ }}
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
                            className="w-full bg-transparent outline-none font-bold text-light-accent leading-6"
                            style={{ fontSize: `${10 * fontSizeMultiplier}px` }}
                        />
                    </div> 
                </div>
            ) : (
                <div 
                    className="relative bg-highlight p-5 h-full w-full flex flex-col text-left border-x-4 border-b-8 border-dark"
                    style={blockTheme}
                > 
                    {isSaving && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-20 flex items-center justify-center">
                            <div className="flex items-center gap-2 text-xs text-white font-medium">
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving…
                            </div>
                        </div>
                    )}
                    <div 
                        className="text-body flex-1 overflow-hidden p-5"
                        style={{  }}
                    >
                        {renderFormattedContent()}
                    </div>
                    <h5 
                        className="font-bold px-5 pb-3 text-light-accent leading-8 shrink-0"
                        style={{ fontSize: `${10 * fontSizeMultiplier}px` }}
                    >
                        {content.title}
                    </h5>
                </div>
            )}
      

        </>
    )
}