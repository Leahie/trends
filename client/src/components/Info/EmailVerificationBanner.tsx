import { useAuth } from "@/context/auth";
import { sendEmailVerification } from "firebase/auth";
import { useState } from "react";

export default function EmailVerificationBanner(){
    const { user } = useAuth();
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    if(!user || user.emailVerified) return null;

    const handleResend = async () => {
        if(!user) return;
        setSending(true);
        try {
            await sendEmailVerification(user)
            setSent(true)
            setTimeout(() => setSent(false), 3000);
        } catch(error){
            console.error("Failed to send verification email: ", error)
        }

        setSending(false);
    };

    return(
        <div className="bg-yellow-500 text-black px-4 py-3 text-center">
            <p className="text-sm">
                Please verify your email to access all features
                <button
                    onClick={handleResend}
                    disabled={sending || sent}
                    className="ml-3 underline font-semibold cursor-pointer"
                >
                    {sent ? 'Email sent!' : 'Resend verification email'}
                </button>
            </p>
        </div>
    )
}