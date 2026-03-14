import mongoose from 'mongoose';

const facilitySchema = new mongoose.Schema({
  name:          { type: String, required: true },
  sportType:     { type: String, required: true,
                   enum: ['Badminton', 'Tennis', 'Squash', 'Basketball', 'TableTennis',
                          'Gym', 'SwimmingPool', 'Auditorium', 'Other'] },
  location:      { type: String, required: true },
  maxPlayers:    { type: Number, default: 2 },
  minGroupSize:  { type: Number, default: 2 },
  slotDuration:  { type: Number, default: 60 },
  operatingHours: {
    start:       { type: String, default: '06:00' },
    end:         { type: String, default: '22:00' },
  },
  isActive:      { type: Boolean, default: true },
  isBookable:    { type: Boolean, default: true },
}, { timestamps: true });

facilitySchema.index({ sportType: 1 });
facilitySchema.index({ isActive: 1, isBookable: 1 });

const Facility = mongoose.model('Facility', facilitySchema);
export default Facility;
