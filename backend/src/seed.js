/**
 * Seed script — populates the database with test facilities and test users.
 *
 * Usage:  node src/seed.js
 *
 * Creates:
 *   • 7 facilities (Badminton x2, Tennis, Squash, Basketball, Gym, SwimmingPool)
 *   • 5 test users (student, faculty, caretaker, executive, admin)
 *     All passwords: "password123"
 *
 * Safe to re-run — skips if data already exists.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Facility from './models/Facility.js';

dotenv.config();

const facilities = [
  {
    name: 'Badminton Court 1',
    sportType: 'Badminton',
    location: 'New SAC Ground Floor',
    maxPlayers: 4,
    minGroupSize: 2,
    slotDuration: 60,
    operatingHours: { start: '06:00', end: '22:00' },
    isBookable: true,
  },
  {
    name: 'Badminton Court 2',
    sportType: 'Badminton',
    location: 'New SAC Ground Floor',
    maxPlayers: 4,
    minGroupSize: 2,
    slotDuration: 60,
    operatingHours: { start: '06:00', end: '22:00' },
    isBookable: true,
  },
  {
    name: 'Tennis Court 1',
    sportType: 'Tennis',
    location: 'Sports Complex',
    maxPlayers: 4,
    minGroupSize: 2,
    slotDuration: 60,
    operatingHours: { start: '06:00', end: '20:00' },
    isBookable: true,
  },
  {
    name: 'Squash Court 1',
    sportType: 'Squash',
    location: 'New SAC First Floor',
    maxPlayers: 2,
    minGroupSize: 2,
    slotDuration: 45,
    operatingHours: { start: '06:00', end: '22:00' },
    isBookable: true,
  },
  {
    name: 'Basketball Court',
    sportType: 'Basketball',
    location: 'Sports Complex',
    maxPlayers: 10,
    minGroupSize: 6,
    slotDuration: 60,
    operatingHours: { start: '06:00', end: '21:00' },
    isBookable: true,
  },
  {
    name: 'Gymnasium',
    sportType: 'Gym',
    location: 'New SAC Second Floor',
    maxPlayers: 50,
    minGroupSize: 1,
    slotDuration: 60,
    operatingHours: { start: '06:00', end: '22:00' },
    isBookable: false, // subscription-based
  },
  {
    name: 'Swimming Pool',
    sportType: 'SwimmingPool',
    location: 'Sports Complex',
    maxPlayers: 30,
    minGroupSize: 1,
    slotDuration: 60,
    operatingHours: { start: '06:00', end: '20:00' },
    isBookable: false, // subscription-based
  },
];

const testUsers = [
  {
    name: 'Test Student',
    email: 'student@iitk.ac.in',
    password: 'password123',
    roles: ['student'],
    isVerified: true,
  },
  {
    name: 'Test Faculty',
    email: 'faculty@iitk.ac.in',
    password: 'password123',
    roles: ['faculty'],
    isVerified: true,
  },
  {
    name: 'Test Caretaker',
    email: 'caretaker@iitk.ac.in',
    password: 'password123',
    roles: ['caretaker'],
    isVerified: true,
  },
  {
    name: 'Test Executive',
    email: 'executive@iitk.ac.in',
    password: 'password123',
    roles: ['executive'],
    isVerified: true,
  },
  {
    name: 'Test Admin',
    email: 'admin@iitk.ac.in',
    password: 'password123',
    roles: ['admin'],
    isVerified: true,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');

    // Seed facilities
    const existingFacilities = await Facility.countDocuments();
    if (existingFacilities === 0) {
      await Facility.insertMany(facilities);
      console.log(`✅ Created ${facilities.length} facilities`);
    } else {
      console.log(`⏭️  Skipped facilities (${existingFacilities} already exist)`);
    }

    // Seed test users
    for (const userData of testUsers) {
      const exists = await User.findOne({ email: userData.email });
      if (!exists) {
        await User.create(userData);
        console.log(`✅ Created user: ${userData.email} [${userData.roles.join(', ')}]`);
      } else {
        console.log(`⏭️  Skipped user: ${userData.email} (already exists)`);
      }
    }

    console.log('\n🎉 Seed complete!\n');
    console.log('Login credentials (all passwords: "password123"):');
    console.log('  student@iitk.ac.in   → Student role');
    console.log('  faculty@iitk.ac.in   → Faculty role');
    console.log('  caretaker@iitk.ac.in → Caretaker role');
    console.log('  executive@iitk.ac.in → Executive role');
    console.log('  admin@iitk.ac.in     → Admin role');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
