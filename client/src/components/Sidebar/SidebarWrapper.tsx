import { useData } from '@/context/data';
import { useSidebar } from '@/context/sidebar';
import { useAuth } from '@/context/auth';
import Sidebar from './Sidebar';

// This wrapper connects all contexts to the Sidebar component
// Use this in your app instead of the raw Sidebar
export default function SidebarConnected() {
  const dataContext = useData();
  const sidebarContext = useSidebar();
  const authContext = useAuth();

  // You'll need to get these from your router
  // For now, providing defaults
  const location = window.location;
  const navigate = (path: string) => {
    window.location.href = path;
  };

  return (
    <Sidebar
      boards={dataContext.boards}
      blocks={dataContext.blocks}
      currentBoard={dataContext.currentBoard}
      user={authContext.user}
      isSyncing={dataContext.isSyncing}
      archiveBoard={dataContext.archiveBoard}
      updateBoard={dataContext.updateBoard}
      createBoard={dataContext.createBoard}
      addBlock={dataContext.addBlock}
      logOut={authContext.logOut}
      openBoards={sidebarContext.openBoards}
      toggleBoard={sidebarContext.toggleBoard}
      isOpen={sidebarContext.isOpen}
      pinnedBoards={sidebarContext.pinnedBoards}
      pinBoard={sidebarContext.pinBoard}
      unpinBoard={sidebarContext.unpinBoard}
      reorderPins={sidebarContext.reorderPins}
      isPinned={sidebarContext.isPinned}
      location={location}
      navigate={navigate}
    />
  );
}