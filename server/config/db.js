import mongoose from "mongoose";

/**
 * MongoDB কানেকশন।
 *
 * serverSelectionTimeoutMS ছোট রাখা হয়েছে যাতে হোস্ট অচল থাকলে
 * সার্ভার চুপচাপ ঝুলে না থেকে দ্রুত পরিষ্কার এরর দেয়।
 */
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI নেই — .env ফাইল দেখুন");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log(`✅ MongoDB কানেক্টেড — ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB এরর: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
