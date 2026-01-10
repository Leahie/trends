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
}