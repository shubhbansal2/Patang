/**
 * seedSlots.js — Idempotent slot seeder for Gym and Swimming facilities.
 *
 * Creates 10 hourly slots per facility:
 *   Morning: 06:00–07:00, 07:00–08:00, 08:00–09:00, 09:00–10:00, 10:00–11:00
 *   Evening: 15:00–16:00, 16:00–17:00, 17:00–18:00, 18:00–19:00, 19:00–20:00
 *
 * Run:  node src/scripts/seedSlots.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Facility from '../models/Facility.js';
import SportsSlot from '../models/SportsSlot.js';

dotenv.config();

const SLOT_TIMES = [
    // Morning block
    { startTime: '06:00', endTime: '07:00' },
    { startTime: '07:00', endTime: '08:00' },
    { startTime: '08:00', endTime: '09:00' },
    { startTime: '09:00', endTime: '10:00' },
    { startTime: '10:00', endTime: '11:00' },
    // Evening block
    { startTime: '15:00', endTime: '16:00' },
    { startTime: '16:00', endTime: '17:00' },
    { startTime: '17:00', endTime: '18:00' },
    { startTime: '18:00', endTime: '19:00' },
    { startTime: '19:00', endTime: '20:00' },
];

const DEFAULT_CAPACITY = 30;

const FACILITIES_TO_SEED = [
    { facilityType: 'gym', name: 'Gymkhana Gym', location: 'New SAC Building' },
    { facilityType: 'swimming', name: 'Swimming Pool', location: 'New SAC Building' },
];

async function seedSlots() {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('❌  MONGO_URI / MONGODB_URI not set in .env');
        process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✔  Connected to MongoDB');

    for (const facDef of FACILITIES_TO_SEED) {
        // Find or create the facility
        let facility = await Facility.findOne({ facilityType: facDef.facilityType });
        if (!facility) {
            facility = await Facility.create({
                name: facDef.name,
                facilityType: facDef.facilityType,
                location: facDef.location,
                capacity: DEFAULT_CAPACITY,
                isOperational: true,
                allowedRoles: ['student', 'faculty'],
            });
            console.log(`✔  Created facility: ${facDef.name}`);
        } else {
            console.log(`ℹ  Facility exists: ${facility.name} (${facDef.facilityType})`);
        }

        // Seed slots (skip if already exist for this facility)
        const existingSlots = await SportsSlot.countDocuments({ facility: facility._id });
        if (existingSlots >= SLOT_TIMES.length) {
            console.log(`ℹ  ${facDef.facilityType}: ${existingSlots} slots already exist — skipping`);
            continue;
        }

        let created = 0;
        for (const time of SLOT_TIMES) {
            const exists = await SportsSlot.findOne({
                facility: facility._id,
                startTime: time.startTime,
                endTime: time.endTime,
            });
            if (exists) continue;

            await SportsSlot.create({
                facility: facility._id,
                startTime: time.startTime,
                endTime: time.endTime,
                capacity: DEFAULT_CAPACITY,
                daysOfWeek: [],          // all days
                isActive: true,
            });
            created++;
        }

        console.log(`✔  ${facDef.facilityType}: created ${created} new slots`);
    }

    await mongoose.disconnect();
    console.log('\n✔  Seed complete');
}

seedSlots().catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
});
