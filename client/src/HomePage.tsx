import { useData } from '@/context/data.tsx'
import type { Board } from '@/types.ts'
import { useState } from 'react'

import './App.css'
import BoardDiv from '@/components/Home/BoardDiv.tsx'
import  Message from '@/components/Home/Message.tsx'
import Subheading from '@/components/Home/Subheading.tsx'
import { useAuth } from '@/context/auth.tsx'


export default function HomePage() {
  const {boards, createBoard} = useData();
  const [isCreating, setIsCreating] = useState(false);
  const {firstName} = useAuth();
  
  const handleCreateBoard = async () => {
    setIsCreating(true);
    await createBoard("Untitled Board");
    setIsCreating(false);
  };

  return (
    <div className='mt-32 mx-16 flex flex-col gap-5'>
      <Message firstName={firstName} />
      <Subheading />
      <div className='flex flex-wrap gap-7'>
        <button
          onClick={handleCreateBoard}
          disabled={isCreating}
          className="flex flex-[0_0_calc(25%-1rem)] h-[150px] items-center justify-center bg-dark border-accent border-t-3 border-b-3 border-r-2 border-l-2 rounded-lg transition-all duration-300 hover:cursor-pointer disabled:opacity-50"
        >
          <span className="text-5xl text-light-accent font-light">+</span>
        </button>
        {boards.map((board: Board) =>(
          <BoardDiv {...board}/>
        ))}
      </div>
    </div>
        
  )
}

