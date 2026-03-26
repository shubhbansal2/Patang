import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';

dotenv.config();
const checkMultiple = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const users = await User.find({ email: 'manastodi23@iitk.ac.in' }).lean();
        console.log("Total users found:", users.length);
        users.forEach((u, i) => {
             console.log(`User ${i + 1}:`, JSON.stringify(u, null, 2));
        });
    } catch (e) {
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
};
checkMultiple();
