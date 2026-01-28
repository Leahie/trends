
import type { SharedTreeNode } from "@/utils/misc";
import { FolderOpen, Folder } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";

type Props = {
  tree: SharedTreeNode;
  currentBoardId: string;
  onNavigate: (id: string) => void;
  title: string;
  isOpen: boolean; // Managed by parent
  onToggle: () => void; // Managed by parent
};


export default function SharedSidebar({ tree, currentBoardId, onNavigate, isOpen, onToggle}: Props) {
    const navigate = useNavigate();
    
  return (
    // <div className="fixed left-0 top-0 bottom-0 w-64 bg-dark border-r border-highlight/40 z-50">
    //   <div className="p-4 font-semibold text-lg">Shared Boards</div>
    //   <nav className="px-2 overflow-y-auto">
    //     <TreeNode
    //       node={tree}
    //       depth={0}
    //       currentBoardId={currentBoardId}
    //       onNavigate={onNavigate}
    //     />
    //   </nav>
    // </div>
    <>
    <Header 
    open={isOpen}
    setOpen={onToggle}
    />
      <div
        id="hs-sidebar-basic-usage"
        className={`
          border-highlight/40 border-r
          h-full
          relative w-64 shrink-0
          transition-all duration-300 transform 
          ${isOpen ? "bg-dark" : "hidden"}
        `}
        role="dialog"
        tabIndex={-1}
        aria-label="Sidebar"
      > 
        <div className={`relative flex flex-col h-full max-h-full ${!isOpen && ""}`}>
          <div className="flex w-full float-right">
            <button
              type="button"
              className="float-right flex justify-center items-center m-2 p-1 gap-x-3 size-7 text-white cursor-pointer focus:outline-none"
              data-hs-overlay="#hs-sidebar-basic-usage" 
              onClick={onToggle}
              tabIndex={-1}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 5V19M16 8H18M16 11H18M16 14H18M6.2 19H17.8C18.9201 19 19.4802 19 19.908 18.782C20.2843 18.5903 20.5903 18.2843 20.782 17.908C21 17.4802 21 16.9201 21 15.8V8.2C21 7.0799 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V15.8C3 16.9201 3 17.4802 3.21799 17.908C3.40973 18.2843 3.71569 18.5903 4.09202 18.782C4.51984 19 5.07989 19 6.2 19Z" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="sr-only">Close</span>
            </button>
            <a
              type="button"
              className="flex justify-center items-center m-2 p-1 gap-x-3 size-7 text-white cursor-pointer focus:outline-none"
              data-hs-overlay="#hs-sidebar-basic-usage" 
              href="https://www.patreon.com/posts/bug-reporting-148623744"
              tabIndex={-1}
            >
              <svg fill="var(--color-accent)" width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <g data-name="Layer 2">
                  <g data-name="menu-arrow-circle">
                    <rect width="24" height="24" transform="rotate(180 12 12)" opacity="0"/>
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                    <path d="M12 6a3.5 3.5 0 0 0-3.5 3.5 1 1 0 0 0 2 0A1.5 1.5 0 1 1 12 11a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-1.16A3.49 3.49 0 0 0 12 6z"/>
                    <circle cx="12" cy="17" r="1"/>
                  </g>
                </g>
              </svg>
              <span className="sr-only">Help</span>
            </a>
            <button
              type="button"
              className="flex justify-center items-center m-2 p-1 gap-x-3 size-7 text-white cursor-pointer focus:outline-none"
              data-hs-overlay="#hs-sidebar-basic-usage" 
              onClick={() => navigate("https://github.com/Leahie")}
              tabIndex={-1}
            >
              <svg width="800px" height="800px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none">
                <path fill="var(--color-accent)" fillRule="evenodd" d="M8 1C4.133 1 1 4.13 1 7.993c0 3.09 2.006 5.71 4.787 6.635.35.064.478-.152.478-.337 0-.166-.006-.606-.01-1.19-1.947.423-2.357-.937-2.357-.937-.319-.808-.778-1.023-.778-1.023-.635-.434.048-.425.048-.425.703.05 1.073.72 1.073.72.624 1.07 1.638.76 2.037.582.063-.452.244-.76.444-.935-1.554-.176-3.188-.776-3.188-3.456 0-.763.273-1.388.72-1.876-.072-.177-.312-.888.07-1.85 0 0 .586-.189 1.924.716A6.711 6.711 0 018 4.381c.595.003 1.194.08 1.753.236 1.336-.905 1.923-.717 1.923-.717.382.963.142 1.674.07 1.85.448.49.72 1.114.72 1.877 0 2.686-1.638 3.278-3.197 3.45.251.216.475.643.475 1.296 0 .934-.009 1.688-.009 1.918 0 .187.127.404.482.336A6.996 6.996 0 0015 7.993 6.997 6.997 0 008 1z" clipRule="evenodd"/>
              </svg>
              <span className="sr-only">Github</span>
            </button>
          </div>
          
          <header className="p-4 flex justify-between items-center gap-x-2">
            <a
              className="flex-none font-semibold text-xl text-white focus:outline-hidden focus:opacity-80"
              href="/"
              aria-label="Brand"
            >
              BoardBash
            </a>
          </header>
          
          <hr className="ml-1 mr-4 text-highlight"></hr>

          <nav className="mt-6 h-full overflow-y-auto text-left">
            <div className="pb-0 px-2 w-full flex flex-col flex-wrap">
              
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <div className="text-xs text-gray-400 uppercase tracking-wide">
                    Boards
                  </div>
                </div>
                <ul>
                  <TreeNode
    node={tree}
    depth={0}
    currentBoardId={currentBoardId}
    onNavigate={onNavigate}
  />
                </ul>
              </div>
            </div>
          </nav>

          <div className="mt-auto p-4 border-t border-highlight">
            <div className="text-sm text-slate-400 mb-2">
              
            </div>
            <button
             onClick={() => navigate("/login")}
              className="w-full py-2 px-4 bg-highlight hover:bg-accent text-white rounded transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-dark"
              tabIndex={-1}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
      </>
  );
}

function TreeNode({
  node,
  depth,
  currentBoardId,
  onNavigate,
}: {
  node: SharedTreeNode;
  depth: number;
  currentBoardId: string;
  onNavigate: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const hasChildren = node.children.length > 0;
  const active = node.board.id === currentBoardId;
  return (
    <div>
      {/* ROW */}
      <div
        className={`
          mb-1 flex items-center gap-2 py-2 px-2.5 rounded-lg text-sm text-white cursor-pointer
          ${active ? "bg-accent" : "hover:bg-highlight/50"}
          group
        `}
        
        onClick={() => onNavigate(node.board.id)}
      >
        <div
        className="flex items-center gap-2 flex-1"
        style={{ paddingLeft: `${(depth) * 12 + 8}px` }}
        >
        {/* FOLDER TOGGLE */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="flex items-center justify-center hover:bg-white/10 rounded focus:outline-none"
          >
            {open ? (
              <FolderOpen className="w-3 h-3" />
            ) : (
              <Folder className="w-3 h-3" />
            )}
          </button>
        )}

        {/* TITLE */}
        <span className="flex-1 truncate" >
          {node.board.title || "Untitled Board"}
        </span>
      </div>
      </div>

      {/* CHILDREN */}
      {open &&
        node.children.map((child) => (
          <TreeNode
            key={child.board.id}
            node={child}
            depth={depth + 1}
            currentBoardId={currentBoardId}
            onNavigate={onNavigate}
          />
        ))}
        
    </div>
  );
}

