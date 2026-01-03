import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage.tsx";
import { DataProvider } from './context/data.tsx'
import { ThemeProvider } from "./context/theme.tsx";

import Sidebar from './components/Sidebar.tsx'
import Login from "./Login.tsx";
import ProtectedRoute from "./ProtectedRoute.tsx";
import Board from "./components/Boards/Board.tsx";
import { useAuth } from "./context/auth.tsx";

const App = () => {
  const {user, loading} = useAuth();

  if (loading) return <div>Loading...</div>;

  const firstName = user?.displayName?.split(' ')[0] || 'User';
  return (
    <BrowserRouter>
        <ThemeProvider>
          
      
          
            <div className='flex h-screen w-screen  '>
              <div className="flex-1 relative overflow-hidden">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  
                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={
                      <DataProvider>
                      <div className='flex h-screen w-screen'>
                        <Sidebar/>
                        <div className="flex-1 relative overflow-hidden">
                          <HomePage firstName={firstName}/>
                        </div>
                      </div>
                      </DataProvider>
                    } />
                    <Route path="/boards/:id" element={
                      <DataProvider>
                      <div className='flex h-screen w-screen'>
                        <Sidebar/>
                        <div className="flex-1 relative overflow-hidden">
                          <Board />
                        </div>
                      </div>
                      </DataProvider>
                    } />
                  </Route>
                </Routes>
              </div>
            </div>
      
        </ThemeProvider>
    </BrowserRouter>


  );
};

export default App;