import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';

dotenv.config({ quiet: true });

const port = process.env.PORT || 5000;

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Database connection established");
    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
};

connectDB().then(() => {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
});