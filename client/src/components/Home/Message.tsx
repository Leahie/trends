interface MessageProps {
    firstName: string;
}

export default function Message({firstName} 
: MessageProps) {
    return(
        <div>
            <p className="text-5xl font-semibold tracking-wide text-primary mb-10">
                Welcome, {firstName}
            </p>
            
        </div>
    )
}