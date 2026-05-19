import mongoose from "mongoose";

export default async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is missing in .env");
  }

  mongoose.set("strictQuery", true);

  const connection = await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || "IPO_G",
  });

  console.log(`MongoDB connected: ${connection.connection.host}/${connection.connection.name}`);
}
