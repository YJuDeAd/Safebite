import mongoose from 'mongoose';

const RecipeSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  pantry: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Recipe || mongoose.model('Recipe', RecipeSchema);
