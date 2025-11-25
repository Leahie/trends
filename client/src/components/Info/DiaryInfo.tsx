import { useState } from 'react'
// Component Imports
import Canvas from '../Canvas.tsx'
import type { DiaryBlockType } from '../../types.ts';

export default function DiaryInfo({node} : {node: DiaryBlockType}) {
  return (
      
        <div className='flex flex-1'>
          <Canvas node={node}/>
        </div>
      
  )
}

