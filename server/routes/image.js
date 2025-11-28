/// Backend does not test the validity of the added items, it just updates what it's told to update
import express from "express";
import admin from "firebase-admin";

const router = express.Router();
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from 'uuid';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.join(__dirname, "../firebase-service-key.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

// Firebase Admin Initialization

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
   storageBucket: "gs://photo-app-edaac.firebasestorage.app"
});

const db = admin.firestore();

// fetch data '/data' route get
router.get("/data", async(req, res) => {
  try{
      const blocksSnapshot = await db.collection("blocks").get();
      const resultsSnapshot = await db.collection("locations").get();

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
      console.log(blocks);
      console.log(locations);
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

// update location 'locations/id' route patch
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

// update batch location 'location/batch' route patch
router.patch("/locations/batch", async (req, res) => {
  const updates = req.body;
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).send({ error: 'No updates provided' });
  }

  try{
    const batch = db.batch();
    Object.entries(updates).forEach((id, location)=>{
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

// add block '/blocks' route post

router.post("/blocks", async (req, res) => {
  const block = req.body.block;
  const location = req.body.location;
  try{
    const uuid = uuidv4();

    const blocksRef = db.collection("blocks");
    const locationRef = db.collection("locations");

    // add it to the blocks collection 
    await blocksRef.doc(uuid).set({
      ...block,
      id: uuid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // update the location to include the new block id
    await locationRef.doc(uuid).set({
      ...location, 
      id: uuid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    return res.status(201).send({ block: { ...block, id: uuid }, location: { ...location, id: uuid } }  );
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