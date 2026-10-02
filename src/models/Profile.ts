import mongoose from 'mongoose';

const ProfileSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  allergies: { type: [String], default: [] },
  strictness: { type: String, default: 'Standard' },
});

export default mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);
