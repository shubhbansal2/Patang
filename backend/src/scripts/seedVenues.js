import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Facility from '../models/Facility.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const seedVenues = async () => {
    await connectDB();

    const venuesToSeed = [
        "FMC room", "LitSoc room", "Drams room", "Fine Arts room", "MPR", 
        "Prayas room", "Senate hall", "SnT room", "MnC room", "Book club room", 
        "Dance club room"
    ];

    try {
        let addedCount = 0;
        for (const venueName of venuesToSeed) {
            const exists = await Facility.findOne({ name: venueName });
            if (!exists) {
                await Facility.create({
                    name: venueName,
                    facilityType: 'venue',
                    location: 'Campus',
                    capacity: 50,
                    allowedRoles: ['student', 'faculty', 'coordinator', 'executive', 'admin'],
                    isOperational: true
                });
                console.log(`+ Added venue: ${venueName}`);
                addedCount++;
            } else {
                console.log(`- Venue already exists: ${venueName}`);
            }
        }
        console.log(`\nSeeding complete. Added ${addedCount} new venues.`);
        process.exit();
    } catch (error) {
        console.error(`Error during seeding: ${error.message}`);
        process.exit(1);
    }
};

seedVenues();
