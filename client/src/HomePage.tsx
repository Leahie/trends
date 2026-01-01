import { useState } from 'react'
// Component Imports
import Canvas from './components/Canvas.tsx'
import { useData } from './context/data.tsx'
import type { Board } from './types.ts'

import './App.css'
import BoardDiv from './components/Home/BoardDiv.tsx'
import  Message from './components/Home/Message.tsx'
import Subheading from './components/Home/Subheading.tsx'

export default function HomePage() {
  const {boards} = useData();
  return (
    <div className='mt-32 mx-16 flex flex-col gap-5'>
      <Message/>
      <Subheading />
      <div className='flex flex-wrap gap-4'>
        {boards.map((board: Board) =>(
          <BoardDiv {...board}/>
        ))}
      </div>
    </div>
        
  )
}

