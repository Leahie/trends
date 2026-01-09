import { useData } from "@/context/data";
import { useEditor } from "@/context/editor";
import { createEditor, Editor, Transforms, Element as SlateElement } from "slate";
import type {Descendant} from "slate";
import {Slate, useSlate, withReact, ReactEditor, Editable} from "slate-react"
import type {TextBlockType} from "@/types/types"
import { useState, useEffect, useCallback, useMemo } from "react";
import { parseBodyContent, serializeSlateContent } from "@/hooks/blocks/textHooks";
import { withHistory } from "slate-history";

import { 
  Bold, Italic, Underline, Code, 
  Heading1, Heading2, Quote, 
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight
} from "lucide-react";


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

export default function TextBlock({id, type, content, boardId}: TextBlockType){
    const {isEditingText, setIsEditingText, editingBlockId, setEditingBlockId} = useEditor();
    const {updateBlock} = useData();
    const [title, setTitle] = useState<string>(content.title);

    
    const isThisBlockEditing = isEditingText && editingBlockId === id;

    const editor = useMemo(()=> withHistory(withReact(createEditor())), []);
    const [value, setValue] = useState<Descendant[]>(() => parseBodyContent(content.body))

    useEffect(() => {
        if (!isThisBlockEditing) {
            setValue(parseBodyContent(content.body));
        }
    }, [content.body, isThisBlockEditing]);
    
    const handleBlur = useCallback(() => {
        setIsEditingText(false);
        setEditingBlockId(null);
        
        const serialized = serializeSlateContent(value);
        
        updateBlock(id, {
            content: {
                ...content,
                body: serialized
            }
        });
    }, [value, id, content, updateBlock, setIsEditingText, setEditingBlockId]);
    
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
        
        return <span {...attributes}>{children}</span>;
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
                        let element = <span key={j}>{content}</span>;
                        
                        if (child.bold) {
                            element = <strong key={j}>{content}</strong>;
                        }
                        if (child.italic) {
                            element = <em key={j}>{element}</em>;
                        }
                        if (child.underline) {
                            element = <u key={j}>{element}</u>;
                        }
                        if (child.code) {
                            element = <code key={j} className="bg-gray-800 px-1 rounded">{content}</code>;
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


    return(    
        <div className=" relative bg-highlight p-5 h-full w-full flex flex-col text-left border-x-4 border-b-8 border-dark">
                {isThisBlockEditing ? (
                    <>
                    <Slate 
                        editor={editor} 
                        initialValue={value}
                        onChange={newValue => setValue(newValue)}
                    >
                    {/* Floating toolbar */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-accent border-b border-dark px-3 py-2 flex gap-1 items-center flex-wrap">
                        <ToolbarButton format="bold" icon={Bold} />
                        <ToolbarButton format="italic" icon={Italic} />
                        <ToolbarButton format="underline" icon={Underline} />
                        <ToolbarButton format="code" icon={Code} />
                        
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
                        className="text-body text-[15px] flex-1 outline-none p-5"
                        renderLeaf={renderLeaf}
                        renderElement={renderElement}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        autoFocus
                        placeholder="Start typing..."
                        spellCheck
                    />
                </Slate>
                        <input 
                    type="text"
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                    className = "outline-none font-bold mb-3 text-[10px] text-light-accent leading-8 flex-shrink-0"
                />     
                    </>

                    ) : (
                        <> 
                        <div className="text-body text-[15px] flex-1 overflow-hidden p-5">
                            {renderFormattedContent()}
                        </div>
                                       
                        <h5 className="font-bold mb-3 text-[10px] text-light-accent leading-8 flex-shrink-0 ">{content.title}</h5></>
                        
                    )}

        </div>
    )
}