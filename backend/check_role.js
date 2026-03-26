import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import fs from 'fs';

dotenv.config();
const checkUserNow = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const user = await User.findOne({ email: 'manastodi23@iitk.ac.in' }).lean();
        fs.writeFileSync('output.json', JSON.stringify(user, null, 2), 'utf-8');
    } catch (e) {
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
};
checkUserNow();
