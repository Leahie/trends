import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage.tsx";
import { DataProvider } from './context/data.tsx'
import { ThemeProvider } from "./context/theme.tsx";
import { AuthProvider } from './context/auth.tsx'; // Import
import { SidebarProvider } from "./context/sidebar.tsx";

import Login from "./Login.tsx";
import ProtectedRoute from "./ProtectedRoute.tsx";
import Board from "./components/Boards/Board.tsx";
import EmailVerificationBanner from "./components/Info/EmailVerificationBanner.tsx";
import SharedBoard from "./components/Boards/SharedBoard.tsx";
import SidebarConnected from "./components/Sidebar/SidebarWrapper.tsx";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <SidebarProvider>
            <EmailVerificationBanner/>
            
            <div className='flex h-screen w-screen  '>
              <div className="flex-1 relative overflow-hidden">
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/shared/:token" element={<SharedBoard />} />
                                            

                  <Route element={<ProtectedRoute />}>
                    <Route path="/" element={
                      <DataProvider>
                      <div className='flex h-screen w-screen'>
                        
                          <SidebarConnected/>
                       
                        <div className="flex-1 relative overflow-hidden">
                          <HomePage />
                        </div>
                      </div>
                      </DataProvider>
                    } />
                    <Route path="/archive" element={
                      <DataProvider>
                      <div className='flex h-screen w-screen'>
                        
                          <SidebarConnected/>
                        
                        <div className="flex-1 relative overflow-hidden">
                          <HomePage />
                        </div>
                      </div>
                      </DataProvider>
                    } />
                    <Route path="/boards/:id" element={
                      <DataProvider>
                      <div className='flex h-screen w-screen'>
                        
                          <SidebarConnected/>
                        
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
          </SidebarProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>


  );
};

export default App;