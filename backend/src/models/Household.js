import mongoose from 'mongoose';

const householdSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: 'Household' },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const Household = mongoose.model('Household', householdSchema);
export default Household;
