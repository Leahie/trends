import { useState } from 'react'
// Component Imports
import Sidebar from './components/Sidebar'
import Canvas from './components/Canvas.tsx'

import rawData from "./data/data.json"
import type {Block, BasePageBlock} from "./types.ts"
import './App.css'

function App() {
  const data: Block[] = rawData as Block[];
  const dataMap: Record<string, Block> = Object.fromEntries(data.map( (b) => [b.id, b]));
  const root:BasePageBlock = data.find(id => id.parent === "none");

  return (
    <div className='flex flex-col fixed inset-0'>
      {/* <div className="h-7 flex items-center px-6 bg-[#3C423F] text-white z-50 shadow-lg">
          <h1 className="text-xl font-semibold">{root.properties.title}</h1>
      </div> */}
      <div className='flex flex-1'>
        <Sidebar node = {root} dataMap={dataMap}/>
        <Canvas node = {root} dataMap={dataMap} />
      </div>
    
    </div>
  )
}

export default App
