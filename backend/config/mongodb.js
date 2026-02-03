// backend/config/mongodb.js
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    mongoose.connection.on('connected', () => {
      console.log('✅ MRH Database Connected');
    });

    mongoose.connection.on('error', (err) => {
      console.log('❌ MongoDB error:', err);
    });

    // Use full Atlas connection string from .env (already includes db name)
    // Example .env:
    // MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/mrh_booking?retryWrites=true&w=majority&tls=true
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error('MONGODB_URI is not set in .env');
    }

    await mongoose.connect(uri, {
      // Optional but safe defaults
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
  } catch (err) {
    console.log('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
};

export default connectDB;
