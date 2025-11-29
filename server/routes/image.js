import express from 'express';
import admin from "firebase-admin";
import multer from "multer";
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

router.post("/upload", upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
        return res.status(400).send({ error: 'No file uploaded' });
        }

        const blockId = req.body.blockId || uuidv4();
        const file = req.file;
        
        const filename = `${blockId}-${Date.now()}-${file.originalname}`;
        const bucket = admin.storage().bucket();
        const fileUpload = bucket.file(`images/${filename}`);

        const stream = fileUpload.createWriteStream({
        metadata: {
            contentType: file.mimetype,
            metadata: {
            firebaseStorageDownloadTokens: uuidv4(), 
            }
        },
        });

        stream.on('error', (error) => {
        console.error('Upload error:', error);
        res.status(500).send({ error: 'Failed to upload file' });
        });

        stream.on('finish', async () => {
        try {
            await fileUpload.makePublic();
            
            const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;
            
            res.status(200).send({
            success: true,
            url: publicUrl,
            filename: filename
            });
        } catch (error) {
            console.error('Error making file public:', error);
            res.status(500).send({ error: 'Failed to make file public' });
        }
        });

        stream.end(file.buffer);

    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

router.delete("/delete/:filename", async (req, res) => {
    const { filename } = req.params;
    try {
        if (!filename) {
            return res.status(400).send({ error: 'Filename required' });
        }

        const bucket = admin.storage().bucket();
        const file = bucket.file(`images/${filename}`);
        
        await file.delete();
        
        res.status(200).send({
        success: true,
        message: 'Image deleted successfully'
    });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
})

export default router;