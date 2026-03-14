import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Route imports
import authRoutes from './routes/authRoutes.js';
import facilityRoutes from './routes/facilityRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import subscriptionAdminRoutes from './routes/subscriptionAdminRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import eventAdminRoutes from './routes/eventAdminRoutes.js';
import penaltyRoutes from './routes/penaltyRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin/subscriptions', subscriptionAdminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin/events', eventAdminRoutes);
app.use('/api/penalties', penaltyRoutes);

// Multer error handling
app.use((err, req, res, next) => {
  if (err.message === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_FILE_TYPE', message: 'Only PDF, JPG, and PNG files are accepted', details: null },
    });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 5 MB limit', details: null },
    });
  }
  next(err);
});

export default app;