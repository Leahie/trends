/// If you see this file, please know it has been tested a LOT and is working :)
import express from "express";
import admin from "firebase-admin";

const router = express.Router();
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});

const upload = multer({ storage });

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
const bucket = admin.storage().bucket(); // image bucket

// // Get Data
router.get("/data", async(req, res) => {
    try {
      const snapshot = await db.collection("images").get();
      if (snapshot.empty) {
        return res.json([]);
      }

      const results = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data();
          console.log("Image data:", data);
          const file = bucket.file(data.name); // name willl be filename
          let url;
          try {
            [url] = await file.getSignedUrl({
              action: "read",
              expires: Date.now() + 1000 * 60 * 60, // 1 hour
            });
          }catch (err) {
            console.log(`Error getting signed URL for ${data.name}:`, err.message);
            url = null;
          }

          return {
            id: doc.id,
            name: data.name,
            title: data.title,
            description: data.description,
            uploadedAt: data.uploadedAt,
            url,
          };
        })
      );
      res.json(results);
    } catch (error) {
      console.log("Error getting images:", error);
      res.status(500).send("Internal Server Error");
    }
})

// Post 
router.post("/", upload.single("image"), async (req, res) => {
  try{
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    const file = req.file;
    const { title, description } = req.body;
    if (!file) {
      return res.status(400).send("No file uploaded.");
    }
    const uniqueName = `${Date.now()}_${file.originalname}`;
    const destination = `images/${uniqueName}`;

    await bucket.upload(file.path, {
      destination,
      metadata: {
        contentType: file.mimetype,
      },
    });

    const [url] = await bucket.file(destination).getSignedUrl({
              action: "read",
              expires: Date.now() + 1000 * 60 * 60, // 1 hour
            });
    
    const docRef = await db.collection("images").add({
      name: destination,
      title: title || "",
      description: description || "",
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      url,
    });

    fs.unlinkSync(file.path);
    res.status(200).json({ id: docRef.id, message: "Image uploaded successfully." });
  }
  catch (error) {
    console.log("Error posting image:", error);
    res.status(500).send("Internal Server Error");
  };
})
// Put 
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  try {
    const docRef = db.collection("images").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).send("Image not found.");
    }
    await docRef.update({
      title: title || doc.data().title,
      description: description || doc.data().description,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(200).send("Image metadata updated successfully.");

  }catch (error) {
    console.log("Error updating image metadata:", error);
    res.status(500).send("Internal Server Error");
  }
});
  
// Delete
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const docRef = db.collection("images").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).send("Image not found.");
    }
    const data = doc.data();
    const file = bucket.file(data.name);
    await file.delete().catch((err) => {
      console.log(`Error deleting file ${data.name}:`, err.message)
      });

    await docRef.delete();
    res.status(200).send("Image deleted successfully.");
  } catch (error) {
    console.log("Error deleting image:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;