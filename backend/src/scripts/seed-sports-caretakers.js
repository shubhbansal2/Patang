import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Facility from '../models/Facility.js';
import User from '../models/User.js';

dotenv.config();

const buildEmail = (sportType) => {
  const slug = String(sportType || 'sport')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^\.|\.$)/g, '');

  return `${slug}.caretaker@iitk.ac.in`;
};

const upsertCaretaker = async ({ sportType, facilityIds }) => {
  const email = buildEmail(sportType);
  let user = await User.findOne({ email });

  const payload = {
    name: `${sportType} Caretaker`,
    email,
    password: 'password123',
    roles: ['caretaker'],
    status: 'active',
    isVerified: true,
    profileDetails: {
      rollNumber: `CT-${sportType.slice(0, 3).toUpperCase()}`,
      department: 'Student Gymkhana',
      program: 'Staff',
      designation: `${sportType} Caretaker`,
      sportType,
      assignedFacilities: facilityIds,
    },
  };

  if (!user) {
    user = new User(payload);
  } else {
    user.name = payload.name;
    user.password = payload.password;
    user.roles = payload.roles;
    user.status = payload.status;
    user.isVerified = payload.isVerified;
    user.profileDetails = payload.profileDetails;
  }

  await user.save();
  return user;
};

const seedSportsCaretakers = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const facilities = await Facility.find({
    facilityType: 'sports',
    isOperational: true,
    sportType: { $ne: null },
  }).select('_id name sportType').lean();

  const grouped = facilities.reduce((accumulator, facility) => {
    const sportType = facility.sportType;
    if (!accumulator[sportType]) {
      accumulator[sportType] = [];
    }

    accumulator[sportType].push(facility._id);
    return accumulator;
  }, {});

  const seeded = [];
  for (const [sportType, facilityIds] of Object.entries(grouped)) {
    const caretaker = await upsertCaretaker({ sportType, facilityIds });
    seeded.push({
      sportType,
      email: caretaker.email,
      assignedFacilities: facilityIds.length,
    });
  }

  console.log(JSON.stringify({ seeded }, null, 2));
};

seedSportsCaretakers()
  .catch((error) => {
    console.error('Sports caretaker seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
