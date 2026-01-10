import express from 'express';
import cors from "cors";
import blocksRouter from './routes/blocks.js';

import imageRouter from './routes/image.js';

import userRouter from "./routes/user.js"

const app = express();
app.use(cors());
app.use(express.json());

// Data Routes, # /api/data/boards, 
app.use('/api/data', blocksRouter);

// Image Routes
app.use('/api/images/', imageRouter);

// User Routes
app.use('/api/user/', userRouter)

// App is Listening on Port 5000
const port = process.env.PORT || 5000; 
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
