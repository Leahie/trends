import { useNavigate } from "react-router-dom";

export default function Header({open, setOpen}: {open: boolean, setOpen: () => void}){
    const navigate = useNavigate();
    return(
        <>
                    <div className={`${open ? "hidden" : "block"} flex z-1000`}>
          <button
              type="button"
              className=" flex justify-center items-center m-2 p-1 gap-x-3 size-7  text-white cursor-pointer "
              onClick={() => setOpen()}
            >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 5V19M16 8H18M16 11H18M16 14H18M6.2 19H17.8C18.9201 19 19.4802 19 19.908 18.782C20.2843 18.5903 20.5903 18.2843 20.782 17.908C21 17.4802 21 16.9201 21 15.8V8.2C21 7.0799 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V15.8C3 16.9201 3 17.4802 3.21799 17.908C3.40973 18.2843 3.71569 18.5903 4.09202 18.782C4.51984 19 5.07989 19 6.2 19Z" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              <span className="sr-only">Close</span>
            </button>
          <button
              type="button"
              className=" flex justify-center items-center m-2 p-1 gap-x-3 size-7  text-white cursor-pointer "
               onClick={() => setOpen()}
            >
              
                <svg fill="var(--color-accent)" width="800px" height="800px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <g data-name="Layer 2">
                <g data-name="menu-arrow-circle">
                <rect width="24" height="24" transform="rotate(180 12 12)" opacity="0"/>
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                <path d="M12 6a3.5 3.5 0 0 0-3.5 3.5 1 1 0 0 0 2 0A1.5 1.5 0 1 1 12 11a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-1.16A3.49 3.49 0 0 0 12 6z"/>
                <circle cx="12" cy="17" r="1"/>
                </g>
                </g>
              </svg>
              <span className="sr-only">Help</span>
            </button>
            <button
              type="button"
              className=" flex justify-center items-center m-2 p-1 gap-x-3 size-7  text-white cursor-pointer "
               onClick={() =>  navigate("https://github.com/Leahie")}
            >
                <svg width="800px" height="800px" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none"><path fill="var(--color-accent)" fill-rule="evenodd" d="M8 1C4.133 1 1 4.13 1 7.993c0 3.09 2.006 5.71 4.787 6.635.35.064.478-.152.478-.337 0-.166-.006-.606-.01-1.19-1.947.423-2.357-.937-2.357-.937-.319-.808-.778-1.023-.778-1.023-.635-.434.048-.425.048-.425.703.05 1.073.72 1.073.72.624 1.07 1.638.76 2.037.582.063-.452.244-.76.444-.935-1.554-.176-3.188-.776-3.188-3.456 0-.763.273-1.388.72-1.876-.072-.177-.312-.888.07-1.85 0 0 .586-.189 1.924.716A6.711 6.711 0 018 4.381c.595.003 1.194.08 1.753.236 1.336-.905 1.923-.717 1.923-.717.382.963.142 1.674.07 1.85.448.49.72 1.114.72 1.877 0 2.686-1.638 3.278-3.197 3.45.251.216.475.643.475 1.296 0 .934-.009 1.688-.009 1.918 0 .187.127.404.482.336A6.996 6.996 0 0015 7.993 6.997 6.997 0 008 1z" clip-rule="evenodd"/></svg>
              <span className="sr-only">Documentation</span>
            </button>
           
            
          </div>
        </>
    )
}