import { useMemo } from "react";
import type { Descendant } from "slate";
import { Element as SlateElement } from "slate";
import type { TextBlockType, Location } from "@/types/types";
import { parseBodyContent } from "@/hooks/blocks/textHooks";
import { generateScheme, schemeToCSSVars } from "@/utils/theme";

type Props = TextBlockType & {
  dims: Location;
};

export default function TextBlockView({ content, dims }: Props) {
  const value = useMemo<Descendant[]>(
    () => parseBodyContent(content.body),
    [content.body]
  );

  const fontSizeMultiplier = useMemo(() => {
    const avg = (dims.width + dims.height) / 2;
    return Math.max(0.5, Math.min(3, avg / 200));
  }, [dims.width, dims.height]);

  const scheme = content.bgColor ? generateScheme(content.bgColor) : null;
  const blockTheme = scheme ? schemeToCSSVars(scheme) : undefined;

  return (
    <div
      className="relative bg-highlight p-5 h-full w-full flex flex-col text-left border-x-4 border-b-8 border-dark"
      style={blockTheme}
    >
      <div className="text-body flex-1 overflow-hidden p-5">
        {value.map((n, i) => renderNode(n, i))}
      </div>

      <h5
        className="font-bold px-5 pb-3 text-light-accent leading-8 shrink-0"
        style={{ fontSize: `${10 * fontSizeMultiplier}px` }}
      >
        {content.title}
      </h5>
    </div>
  );
}

/* ---------- static render helpers ---------- */

function renderNode(node: Descendant, key: number | string): React.ReactNode {
  if (SlateElement.isElement(node)) {
    const el = node as any;
    const children = el.children.map((n: any, i: number) => renderNode(n, i));

    const style: React.CSSProperties = {};
    if (el.align) style.textAlign = el.align;

    switch (el.type) {
      case "link":
        return (
          <a
            key={key}
            href={el.url}
            className="text-blue-400 underline cursor-pointer hover:text-blue-300"
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                window.open(el.url, "_blank");
              }
            }}
          >
            {children}
          </a>
        );
      case "numbered-list":
        return (
          <ol key={key} style={style} className="list-decimal ml-6">
            {children}
          </ol>
        );
      case "bulleted-list":
        return (
          <ul key={key} style={style} className="list-disc ml-6">
            {children}
          </ul>
        );
      case "list-item":
        return <li key={key}>{children}</li>;
      case "heading-one":
        return (
          <h1 key={key} style={style} className="text-2xl font-bold">
            {children}
          </h1>
        );
      case "heading-two":
        return (
          <h2 key={key} style={style} className="text-xl font-bold">
            {children}
          </h2>
        );
      default:
        return (
          <p key={key} style={style}>
            {children}
          </p>
        );
    }
  }

  // TEXT NODE
  const n: any = node;
  const style: React.CSSProperties = {};

  if (n.fontSize) style.fontSize = n.fontSize;
  if (n.color) style.color = n.color;
  if (n.backgroundColor) style.backgroundColor = n.backgroundColor;

  let el = (
    <span key={key} style={style}>
      {n.text}
    </span>
  );

  if (n.bold) el = <strong key={key}>{el}</strong>;
  if (n.italic) el = <em key={key}>{el}</em>;
  if (n.underline) el = <u key={key}>{el}</u>;
  if (n.code) el = <code key={key}>{el}</code>;

  return el;
}
