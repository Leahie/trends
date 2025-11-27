import express from 'express';
import cors from "cors";
import imageRouter from './routes/image.js';

const app = express();
app.use(cors());
app.use(express.json());

// Image Routes
app.use('/api/', imageRouter);

// App is Listening on Port 5000
const port = process.env.PORT || 5000; 
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
