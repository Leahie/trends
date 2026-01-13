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

            await db.collection("users").doc(userId).set(defaultUserData)
            return res.send({
                role: 'user',
                boardLimit: 5
            })
        }
        const userData = userDoc.data();
        res.send({
            role: userData.role || 'user',
            boardLimit: userData.boardLimit || 5,
            pinnedBoards: userData.pinnedBoards || []
        });
    }catch (error) {
        console.log("Error getting user info:", error);
        res.status(500).send("Internal Server Error");
    }
});

// pinning a board
router.post("/pins", async(req, res) => {
    try {
        const userId = req.user.uid;
        const { boardId } = req.body; 

        if (!boardId){
            return res.status(400).send("boardId is required");
        }

        const boardDoc = await db.collection("boards").doc(boardId).get();
        if (!boardDoc.exists){
            return res.status(404).send("Board not found");
        }

        const board = boardDoc.data();
        if (board.deletedAt !== null){
            return res.status(404).send("Board not found");
        }

        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        let currentPins = [];
        if (userDoc.exists){
             currentPins = userDoc.data().pinnedBoards || [];
        }

        if (currentPins.includes(boardId)) {
            return res.status(400).send("Board is already pinned");
        }
        
        currentPins.push(boardId);

        if (userDoc.exists) {
            await userRef.update({
                pinnedBoards: currentPins,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await userRef.set({
                email: req.user.email,
                role: 'user',
                boardLimit: 5,
                pinnedBoards: currentPins,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        res.send({
            success: true,
            boardId,
            pinnedBoards: currentPins
        });

    } catch (error) {
        console.log("Error pinning board:", error);
        res.status(500).send("Internal Server Error");
    }
})

router.delete("/pins/:boardId", async(req, res) => {
    try {
        const userId = req.user.uid;
        const { boardId } = req.params;

        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).send("User document not found");
        }

        const currentPins = userDoc.data().pinnedBoards || []; 

        if (!currentPins.includes(boardId)) {
            return res.status(400).send("Board is not pinned");
        }
        
        const updatedPins = currentPins.filter(id => id !== boardId);

        await userRef.update({
            pinnedBoards: updatedPins,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.send({
            success: true,
            boardId,
            pinnedBoards: updatedPins
        });
    } catch (error) {
        console.log("Error unpinning board:", error);
        res.status(500).send("Internal Server Error");
    }
})

router.patch("/pins/reorder", async(req, res) => {
    try {
        const userId = req.user.uid;
        const { pinnedBoards } = req.body;

        if (!Array.isArray(pinnedBoards)) {
            return res.status(400).send("pinnedBoards must be an array");
        }

        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).send("User document not found");
        }

        await userRef.update({
            pinnedBoards,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.send({
            success: true,
            pinnedBoards
        });
    } catch (error) {
        console.log("Error reordering pins:", error);
        res.status(500).send("Internal Server Error");
    }
});

export default router