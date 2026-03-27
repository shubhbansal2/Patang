import dotenv from 'dotenv';
import mongoose from 'mongoose';

import User from '../models/User.js';
import Event from '../models/Event.js';

dotenv.config();

const upsertEvent = async (query, update) => {
  const existing = await Event.findOne(query);
  if (existing) {
    Object.assign(existing, update);
    await existing.save();
    return existing;
  }

  return Event.create({ ...query, ...update });
};

const seedDashboardEvents = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const executive = await User.findOne({ email: 'executive@iitk.ac.in' });
  if (!executive) {
    throw new Error('executive@iitk.ac.in user not found in the target database');
  }

  const events = [
    {
      title: 'Udghosh Practice Session',
      description: 'Open practice session for upcoming inter-hall participation.',
      category: 'Sports',
      venue: 'Main Sports Complex',
      organizingClub: 'Udghosh',
      registrationLink: 'https://example.com/udghosh-practice',
      dayOffset: 1,
      hour: 18,
      durationHours: 2,
    },
    {
      title: 'Aquatics Orientation Camp',
      description: 'Introductory session covering pool rules, lane etiquette, and warm-up drills.',
      category: 'Sports',
      venue: 'Swimming Pool',
      organizingClub: 'Aquatics Club',
      registrationLink: 'https://example.com/aquatics-orientation',
      dayOffset: 3,
      hour: 17,
      durationHours: 2,
    },
  ];

  const seeded = [];
  for (const eventData of events) {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + eventData.dayOffset);
    startTime.setHours(eventData.hour, 0, 0, 0);

    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + eventData.durationHours);

    const event = await upsertEvent(
      { title: eventData.title, createdBy: executive._id },
      {
        description: eventData.description,
        category: eventData.category,
        startTime,
        endTime,
        venue: eventData.venue,
        organizingClub: eventData.organizingClub,
        registrationLink: eventData.registrationLink,
        status: 'Approved',
        createdBy: executive._id,
        reviewedBy: executive._id,
        reviewedAt: new Date(),
      }
    );

    seeded.push({
      title: event.title,
      startTime: event.startTime,
      venue: event.venue,
      status: event.status,
    });
  }

  console.log(JSON.stringify({ seeded }, null, 2));
};

seedDashboardEvents()
  .catch((error) => {
    console.error('Dashboard event seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
