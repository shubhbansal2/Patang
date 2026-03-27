import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import FacilityBlock from '../models/FacilityBlock.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const blocks = await FacilityBlock.find().lean();
        console.log(`=== BLOCKS ===`);
        for (const b of blocks) {
           console.log(`Block ID: ${b._id}, ReqBy: ${b.requestedBy}`);
           const user = await User.findById(b.requestedBy).lean();
           console.log(`  User: ${user ? user.email : 'NOT FOUND'} roles: ${user ? user.roles : '...'}`);
        }
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
check();
