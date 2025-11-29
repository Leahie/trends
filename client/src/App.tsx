import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage.tsx";
import { DataProvider } from './context/data.tsx'
import { ThemeProvider } from "./context/theme.tsx";
import BlockInfo from "./BlockInfo.tsx";
import Sidebar from './components/Sidebar.tsx'


const App = () => {
  return (
    <ThemeProvider>
      <DataProvider>
    <BrowserRouter>
      
      
        <div className='flex h-screen w-screen  '>
          <Sidebar/>
          <div className="flex-1 relative overflow-hidden">
            <Routes>
              
                <Route path="/" element={ <HomePage />} />
                <Route path="/blocks/:id" element = { <BlockInfo />}/>
            </Routes>
          </div>
        </div>
      
      
    </BrowserRouter>
    </DataProvider>
    </ThemeProvider>
  );
};

export default App;