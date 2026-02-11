import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

const connectCloudinary = async () => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log("✅ Cloudinary Configured");
  } catch (error) {
    console.error("❌ Cloudinary Config Error:", error);
  }
};

// 1. Export the function as a NAMED export
export { connectCloudinary };

// 2. Export the cloudinary instance as the DEFAULT export
export default cloudinary;