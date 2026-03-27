import dotenv from 'dotenv';
import mongoose from 'mongoose';

import User from '../models/User.js';
import SubscriptionV2 from '../models/SubscriptionV2.js';

dotenv.config();

const SEEDED_USERS = [
  {
    email: 'student@iitk.ac.in',
    name: 'Test Student',
    password: 'password123',
    roles: ['student'],
    status: 'active',
    isVerified: true,
    profileDetails: {
      rollNumber: '230001',
      department: 'CSE',
      program: 'BTech',
      designation: 'Student',
      assignedFacilities: [],
    },
  },
  {
    email: 'caretaker@iitk.ac.in',
    name: 'Test Caretaker',
    password: 'password123',
    roles: ['caretaker'],
    status: 'active',
    isVerified: true,
    profileDetails: {
      rollNumber: 'CT001',
      department: 'Student Gymkhana',
      program: 'Staff',
      designation: 'Facility Caretaker',
      assignedFacilities: [],
    },
  },
  {
    email: 'gymadmin@iitk.ac.in',
    name: 'Test Gym Admin',
    password: 'password123',
    roles: ['gym_admin'],
    status: 'active',
    isVerified: true,
    profileDetails: {
      rollNumber: 'GA001',
      department: 'Student Gymkhana',
      program: 'Staff',
      designation: 'Gym Admin',
      assignedFacilities: [],
    },
  },
  {
    email: 'executive@iitk.ac.in',
    name: 'Test Executive',
    password: 'password123',
    roles: ['executive'],
    status: 'active',
    isVerified: true,
    profileDetails: {
      rollNumber: 'EX001',
      department: 'Student Gymkhana',
      program: 'Staff',
      designation: 'Executive',
      assignedFacilities: [],
    },
  },
];

const upsertUser = async ({ email, password, ...fields }) => {
  let user = await User.findOne({ email });

  if (!user) {
    user = new User({ email, password, ...fields });
  } else {
    user.name = fields.name;
    user.roles = fields.roles;
    user.status = fields.status;
    user.isVerified = fields.isVerified;
    user.profileDetails = fields.profileDetails;
    user.password = password;
  }

  await user.save();
  return user;
};

const repair = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const unsetResult = await SubscriptionV2.updateMany(
    { passId: null },
    { $unset: { passId: 1 } }
  );

  const users = [];
  for (const seededUser of SEEDED_USERS) {
    const user = await upsertUser(seededUser);
    users.push({
      email: user.email,
      roles: user.roles,
      profileDetails: user.profileDetails,
    });
  }

  console.log(
    JSON.stringify(
      {
        passIdUnset: {
          matched: unsetResult.matchedCount,
          modified: unsetResult.modifiedCount,
        },
        users,
      },
      null,
      2
    )
  );
};

repair()
  .catch((error) => {
    console.error('Cloud data repair failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
