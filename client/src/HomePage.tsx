import { useState } from 'react'
// Component Imports
import Canvas from './components/Canvas.tsx'
import { useData } from './context/data.tsx'

import './App.css'

export default function HomePage() {
  const {root} = useData();
  return (
      
        <div className='flex flex-1'>
          <Canvas node={root}/>
        </div>
      
  )
}

