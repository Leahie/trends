import type {Block} from "../types.ts";
import {useState, useEffect} from 'react';  // will be used later when we fetch data 

interface SidebarNodeProps{
    node: Block;
    dataMap:  Record<string, Block>
}

function SidebarNode({node, dataMap}: SidebarNodeProps){
    return(
        <div className="flex-col">
        <li></li>
        <li>
            <a
                className={`flex items-center gap-1 py-2 px-2.5 text-sm text-gray-800 rounded-lg focus:outline-hidden  dark:bg-neutral-700 dark:hover:bg-neutral-700 dark:focus:bg-neutral-700 dark:text-white ${node.type == "diary_entry" && "hover:bg-gray-100"}`}
                href="#"
            >
                {node.properties.title} 
                {node.type == "diary_entry" && 
                <svg width="12px" height="12px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 8C3 5.17157 3 3.75736 3.87868 2.87868C4.75736 2 6.17157 2 9 2H15C17.8284 2 19.2426 2 20.1213 2.87868C21 3.75736 21 5.17157 21 8V16C21 18.8284 21 20.2426 20.1213 21.1213C19.2426 22 17.8284 22 15 22H9C6.17157 22 4.75736 22 3.87868 21.1213C3 20.2426 3 18.8284 3 16V8Z" stroke="#1C274C" stroke-width="1.5"/>
                    <path d="M8 2.5V22" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M2 12H4" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M2 16H4" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M2 8H4" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M11.5 6.5H16.5" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M11.5 10H16.5" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
                </svg>}
            </a>
        </li>

        { "content" in node && node.content.length > 0 && (
        <ol className="pl-2">
            {node.content.map((childId:string) => <SidebarNode node={dataMap[childId]} dataMap={dataMap} />)}
        </ol>)
        }
        </div>
    )
}

export default function Sidebar({node, dataMap}: {node: Block, dataMap: Record<string, Block>}){

    return(
        <div
      id="hs-sidebar-basic-usage"
      className="
        hs-overlay [--auto-close:lg] lg:block lg:translate-x-0 lg:end-auto lg:bottom-0
        w-64 hs-overlay-open:translate-x-0 -translate-x-full
        transition-all duration-300 transform h-full hidden
        fixed top-0 start-0 bottom-0 z-60
        bg-white border-e border-gray-200
        dark:bg-neutral-800 dark:border-neutral-700
      "
      role="dialog"
      tabIndex={-1}
      aria-label="Sidebar"
    >
      <div className="relative flex flex-col h-full max-h-full">
        {/* Header */}
        <header className="p-4 flex justify-between items-center gap-x-2">
          <a
            className="flex-none font-semibold text-xl text-black focus:outline-hidden focus:opacity-80 dark:text-white"
            href="#"
            aria-label="Brand"
          >
            {node.properties.title}
          </a>

          <div className="">
            <button
              type="button"
              className="flex justify-center items-center p-1 gap-x-3 size-8 text-sm text-gray-600 hover:bg-slate-100 rounded-full disabled:opacity-50 disabled:pointer-events-none focus:outline-hidden "
              data-hs-overlay="#hs-sidebar-basic-usage"
            >
                <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 5V19M16 8H18M16 11H18M16 14H18M6.2 19H17.8C18.9201 19 19.4802 19 19.908 18.782C20.2843 18.5903 20.5903 18.2843 20.782 17.908C21 17.4802 21 16.9201 21 15.8V8.2C21 7.0799 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V15.8C3 16.9201 3 17.4802 3.21799 17.908C3.40973 18.2843 3.71569 18.5903 4.09202 18.782C4.51984 19 5.07989 19 6.2 19Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>
        </header>
        {/* End Header */}

        {/* Body */}
        <nav className="h-full overflow-y-auto 
          [&::-webkit-scrollbar]:w-2 
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-track]:bg-gray-100
          [&::-webkit-scrollbar-thumb]:bg-gray-300
          dark:[&::-webkit-scrollbar-track]:bg-neutral-700
          dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
        >
          <div className="pb-0 px-2 w-full flex flex-col flex-wrap">
            <ul className="space-y-1">
                {node.content.map((childId:string) => <SidebarNode node={dataMap[childId]} dataMap={dataMap} />)}
           
            </ul>
          </div>
        </nav>
        {/* End Body */}
      </div>
    </div>
    )
}