import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "";

// Check at module load time
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in environment variables");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Use global to persist connection across hot reloads in development
const globalWithMongoose = global as typeof globalThis & {
  mongoose: MongooseCache;
};

let cached: MongooseCache = globalWithMongoose.mongoose || { conn: null, promise: null };

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = cached;
}

async function connectToDatabase(): Promise<typeof mongoose> {
  // Check URI at runtime
  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not defined. Please add it to your .env file:\n" +
      "MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname"
    );
  }

  if (cached.conn) {
    console.log("✅ Using cached MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("🔄 Connecting to MongoDB...");
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log("✅ MongoDB connected successfully");
        return mongooseInstance;
      })
      .catch((error) => {
        console.error("❌ MongoDB connection failed:", error.message);
        cached.promise = null; // Reset so we can retry
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectToDatabase;

