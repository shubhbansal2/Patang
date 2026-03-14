import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';

// Cron job imports
import groupExpiryJob from './jobs/groupExpiryJob.js';
import noShowJob from './jobs/noShowJob.js';
import subscriptionExpiryJob from './jobs/subscriptionExpiryJob.js';
import slotGenerationJob from './jobs/slotGenerationJob.js';

dotenv.config();

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
    // Start scheduled jobs
    groupExpiryJob();
    noShowJob();
    subscriptionExpiryJob();
    slotGenerationJob();

    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
});