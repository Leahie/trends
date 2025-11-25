export default function Context({x, y, selected}:{x:number, y:number, selected:string|null}){
    console.log("selected", selected);
    return(
        <div className="text-left  absolute w-fit h-fit flex flex-col bg-white border text-black text-[11px] rounded shadow cursor-default " 
        style={{ top: y, left: x, position: "absolute", }}>
            <ul className=" w-full py-3">
                <li></li>
                <li className="context-li">Add</li>
                <hr className="ml-1 mr-4 text-light-accent/50" />
                <ul className="">
                    <li className="context-li">Text Block</li>
                    <li className="context-li">Image Block</li>
                    <li className="context-li">Diary Block</li>
                </ul>
                {
                    selected!=null && 
                    <>
                    <hr className=" mt-2.5 ml-1 mr-4 text-light-accent/50" />
                        <li className="context-li">Delete</li>
                        
                    </>

                }
            </ul>
        </div>
    )
}