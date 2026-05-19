import mongoose from "mongoose";

const ipoSchema = new mongoose.Schema(
  {
    id: String,
    name: { type: String, trim: true },
    minPrice: Number,
    maxPrice: Number,
    shareCount: Number,
    priceBand: String,
    lotSize: Number,
    retailAmount: Number,
    shniAmount: Number,
    status: String,
    sector: String,
    exchange: String,
    gmp: String,
    openDate: String,
    closeDate: String,
  },
  { _id: false }
);

const clientSchema = new mongoose.Schema(
  {
    id: String,
    name: { type: String, trim: true },
    pan: { type: String, uppercase: true, trim: true },
    balance: Number,
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    id: String,
    ipoId: String,
    ipoName: String,
    clientId: String,
    clientName: String,
    upi: String,
    status: String,
    isAllotted: { type: Boolean, default: false },
    allottedAt: String,
    appliedAt: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    userId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    otpHash: String,
    otpExpiresAt: Date,
    workspace: {
      ipos: { type: [ipoSchema], default: [] },
      clients: { type: [clientSchema], default: [] },
      upis: { type: [String], default: [] },
      applications: { type: [applicationSchema], default: [] },
    },
  },
  { timestamps: true, collection: process.env.MONGODB_COLLECTION || "IPO" }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ userId: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

export default User;
