import mongoose from 'mongoose';

const accessLogSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        subscription: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SubscriptionV2'
        },
        facilityType: {
            type: String,
            enum: ['gym', 'swimming', 'Gym', 'SwimmingPool'],
            required: true
        },
        action: {
            type: String,
            enum: ['entry', 'exit'],
            required: true
        },
        scannedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        scannedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

accessLogSchema.index({ user: 1, facilityType: 1, scannedAt: -1 });

const AccessLog = mongoose.model('AccessLog', accessLogSchema);

export default AccessLog;
