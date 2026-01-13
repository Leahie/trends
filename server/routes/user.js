import express from "express";
import { admin, db } from "../firebase.js"
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

router.get("/info", async(req, res) => {
    try{
        const userId = req.user.uid;

        const userDoc = await db.collection("users").doc(userId).get();

        if(!userDoc){
            const defaultUserData = {
                email: req.user.email,
                role: 'user',
                boardLimit: 5,
                pinnedBoards: [], // Array of board IDs
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection("users").doc(userId).set({
                email: req.user.email,
                role: 'user',
                boardLimit: 5,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            })
            return res.send({
                role: 'user',
                boardLimit: 5
            })
        }
        const userData = userDoc.data();
        res.send({
            role: userData.role || 'user',
            boardLimit: userData.boardLimit || 5,
        });
    }catch (error) {
        console.log("Error getting user info:", error);
        res.status(500).send("Internal Server Error");
    }
});

export default router