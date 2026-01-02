import type {Board} from "../../types.ts"
import { useNavigate } from "react-router-dom";

export default function BoardDiv({id, title, updatedAt, userId}: Board){
    const updatedAtDate = new Date(updatedAt?._seconds * 1000);
    const navigate = useNavigate();

    return( 
        <div className=" flex flex-col flex-[0_0_calc(25%-1rem)]  h-[150px] bg-dark  border-accent border-t-3 border-b-5 border-r-5 border-l-2 rounded-lg
        transition-border duration-300
        hover:cursor-pointer hover:border-light-accent hover:shadow-md shadow-accent
        "
        onClick={() => navigate(`/boards/${id}`)} 
        >
            <div className="absolute inset-y-0 left-1 w- -translate-x-1/2 bg-black/30 pointer-events-none"></div>

            <h5 className="
                bg-highlight
                text-xl
                font-semibold
                truncate
                whitespace-nowrap
                overflow-hidden
                pl-4
                py-1
                text-left
            ">{title}</h5>
            <p className="text-sm mt-auto text-right pr-2 pb-2 text-subtext">{updatedAtDate.toLocaleString()}</p>

        </div>
    )
}