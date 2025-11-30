/// Backend does not test the validity of the added items, it just updates what it's told to update
import express from "express";
import { admin, db } from "../firebase.js";
import { authenticateUser } from "../middleware/auth.js";


const router = express.Router();
import { v4 as uuidv4 } from 'uuid';



router.use(authenticateUser);


// fetch data '/data' route get

router.get("/", async(req, res) => {
  try{
      const userId = req.user.uid;
      const blocksSnapshot = await db.collection("blocks")
      .where("userId", "==", userId)
      .get();
      const resultsSnapshot = await db.collection("locations")
      .where("userId", "==", userId)
      .get();

      const blocks = blocksSnapshot.docs.map((doc) => 
        {
          const data = doc.data()
          return {
            id: doc.id,type: data.type, parent: data.parent, content:data.content, properties: data.properties
          }
        });

      const locations = {}
      resultsSnapshot.docs.forEach((doc) =>
      {
        const { createdAt, ...cleanData } = doc.data();  // <-- removes createdAt
        locations[doc.id] = cleanData;
      })
      res.send({blocks, locations});
  }catch (error) {
      console.log("Error getting blocks and locations:", error);
      res.status(500).send("Internal Server Error");
  }


})

// update block '/blocks/id' route patch
router.patch("/blocks/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try{
    if (!updates){
      return res.status(400).send("No updates provided.");
    }
    const blockRef = db.collection("blocks").doc(id);
    const blockDoc = await blockRef.get();

    if (!blockDoc.exists) {
      return res.status(404).send({ error: "Block not found." });
    }
    
    await blockRef.update(updates);


    const updatedBlockDoc = await blockRef.get();
    const updatedBlock = { id: updatedBlockDoc.id, ...updatedBlockDoc.data() };
    const {createdAt, ...cleaned} = updatedBlock
    res.send(cleaned)
  } catch (error) {
    console.log("Error updating block:", error);
    return res.status(500).send("Internal Server Error");
  }
});

// update batch location 'location/batch' route patch
router.patch("/locations/batch", async (req, res) => {
  const updates = req.body;
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).send({ error: 'No updates provided' });
  }

  try{
    const batch = db.batch();
    Object.entries(updates).forEach(([id, location])=>{
      const locRef = db.collection('locations').doc(id);
      batch.update(locRef, location);
    })
    await batch.commit();
    res.send({ success: true, updatedIds: Object.keys(updates) });
  } catch (error) {
    console.error('Error batch updating locations:', error);
    res.status(500).send({ error: 'Internal Server Error' });
  }
})

// update location 'locations/id' dute patch
router.patch("/locations/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try{
    if (!updates){
      return res.status(400).send("No updates provided.");
    }
    const locationRef = db.collection("locations").doc(id);
    const locationDoc = await locationRef.get();

    if (!locationDoc.exists) {
      return res.status(404).send({ error: "Location not found." });
    }
    
    await locationRef.update(updates);


    const updatedLocationDoc = await locationRef.get();
    const updatedLocation = { id: updatedLocationDoc.id, ...updatedLocationDoc.data() };
    const {createdAt, ...cleaned} = updatedLocation
    res.send(cleaned)
  } catch (error) {
    console.log("Error updating location:", error);
    return res.status(500).send("Internal Server Error");
  }
});

// add block '/blocks' route post

router.post("/blocks", async (req, res) => {
  const block = req.body.block;
  const location = req.body.location;
  const userId = req.user.uid;
  try{
    const blockIdFromClient = block && block.id;

    // choose id: use provided id when present (makes creation idempotent), otherwise generate
    const uuid = blockIdFromClient || uuidv4();

    const blocksRef = db.collection("blocks");
    const locationRef = db.collection("locations");

    const blockDocRef = blocksRef.doc(uuid);
    const existing = await blockDocRef.get();

    if (existing.exists) {
      if (existing.data().userId !== userId) {
        return res.status(403).send({ error: "Forbidden" });
      }
      const existingData = existing.data();
      const { createdAt, ...cleaned } = { id: existing.id, ...existingData };
      if (location) {
        await locationRef.doc(uuid).set({ ...location, id: uuid, userId, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
      return res.status(200).send({ block: cleaned, location: location ? { ...location, id: uuid } : undefined });
    }

    // create new block and location
    await blockDocRef.set({
      ...block,
      id: uuid,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // update the location to include the new block id
    await locationRef.doc(uuid).set({
      ...location, 
      id: uuid,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return res.status(201).send(
      { block: { ...block, id: uuid, userId }, location: { ...location, id: uuid, userId } }  );
  }catch (error) {
    console.log("Error adding block and location:", error);
    res.status(500).send("Internal Server Error");
  }
  
});

// delete block '/blocks/id' route delete
router.delete("/blocks/:id", async(req, res)=>{
  const {id} = req.params;
  try{
    const blocksRef = db.collection("blocks").doc(id);
    const locationRef = db.collection("locations").doc(id);
    await blocksRef.delete();
    await locationRef.delete();
    return res.status(201).send({message: "Deleted Block and Location successfully", id});
  }catch (error){
    console.log("Error deleting block and location:", error);
    res.status(500).send("Internal Server Error");
  }
})



export default router;