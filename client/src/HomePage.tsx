import { useData } from '@/context/data.tsx'
import type { Board } from '@/types/types'
import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import './App.css'
import BoardDiv from '@/components/Home/BoardDiv.tsx'
import ArchiveBoardDiv from '@/components/Home/ArchiveBoardDiv.tsx'
import  Message from '@/components/Home/Message.tsx'
import { useAuth } from '@/context/auth.tsx'
import { useSidebar } from './context/sidebar'
import { Star } from 'lucide-react'


export default function HomePage() {
  const {boards, archivedBoards, archiveBoard,loadArchivedBoards, deleteBoard, restoreBoard, createBoard, canCreateBoard, userRole, boardLimit, userVerified} = useData();
  const {pinnedBoards} = useSidebar()
  const [isCreating, setIsCreating] = useState(false);
  const {firstName} = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isRecents = location.pathname === '/';
  const isArchived = location.pathname === '/archive';

  const pinnedBoardObjects = pinnedBoards
        .map(id => boards.find(b => b.id === id))
        .filter(Boolean);

        console.log(pinnedBoardObjects)

  const handleCreateBoard = async () => {
    if(!userVerified){
      alert(`You have to verify your email before creating a board`);
      return;
    }
    if(!canCreateBoard){
      alert(`You've reached your limit of ${boardLimit} boards. Contact admin to upgrade!`);
      return;
    }
    setIsCreating(true);
    const result = await createBoard("Untitled Board");
    setIsCreating(false);
  };

  useEffect(() => {
    if (isArchived) {
      loadArchivedBoards();
    }
  }, [isArchived]);

  return (
    <div className='mt-32 mx-16 flex flex-col gap-5'>
      <Message firstName={firstName} />
      {/* Pinned Boards Section */}
                {pinnedBoardObjects!=undefined && pinnedBoardObjects.length > 0 && (
                    <div className="mb-12">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                            Pinned Boards
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pinnedBoardObjects.map((board: Board) => (<BoardDiv key = {board.id} {...board} />))}
                        </div>
                    </div>
                )}
                
      <div className='flex gap-2 items-center'> 
        
        <button
          onClick={() => navigate('/')}
          className={`transition-colors duration-200 ${
            isRecents ? 'text-primary' : 'text-secondary hover:text-primary'
          }`}
        >
          <p className="text-xl font-semibold tracking-wide text-left">
            Recents
          </p>
        </button>
        <span className="text-xl font-semibold tracking-wide text-secondary select-none">|</span>
        <button
          onClick={() => {navigate('/archive')}}
          className={`transition-colors duration-200 ${
            isArchived ? 'text-primary' : 'text-secondary hover:text-primary'
          }`}
        >
          <p className="text-xl font-semibold tracking-wide text-left">
            Archived
          </p>
        </button>
      </div>
      {isRecents && userRole === 'user' && (
        <p className="text-sm text-gray-500">
            Boards: {boards.length} / {boardLimit}
        </p>
      )}

      <div>
        {isRecents && (
          <div>

          </div>

        )}
      </div>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {isRecents ? (

          
          <>
          
            <button
              onClick={handleCreateBoard}
              disabled={isCreating}
              className={`flex flex-[0_0_calc(25%-1rem)] h-[150px] items-center justify-center bg-dark border-accent border-t-3 border-b-3 border-r-2 border-l-2 rounded-lg transition-all duration-300 disabled:opacity-50${
                canCreateBoard ? 'hover:cursor-pointer' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <span className="text-5xl text-light-accent font-light">+</span>
            </button>
            {boards.map((board: Board) =>(
              <BoardDiv key={board.id} {...board}/>
            ))}
          </>
        ): (
          <>
           {archivedBoards.map((board: Board) =>(
            <ArchiveBoardDiv key={board.id}{...board}/>
          ))}
          </>
        )}
        
      </div>
    </div>
        
  )
}

