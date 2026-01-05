interface SubheadingProps {
    value?: string;
}

export default function Subheading({ value }: SubheadingProps){
    return(
        <div>
            <p className="text-xl text-secondary font-semibold tracking-wide text-left">
                {value}
            </p>
            
        </div>
    )
}