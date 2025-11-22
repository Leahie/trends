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
    <>
    <Sidebar node = {root} dataMap={dataMap}/>
    <Canvas node = {root} dataMap={dataMap} />
    </>
  )
}

export default App
