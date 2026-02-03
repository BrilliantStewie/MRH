import { v2 as cloudinary } from "cloudinary";

const connectCloudinary = async () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, // Matches .env
    api_key: process.env.CLOUDINARY_API_KEY,       // Matches .env
    api_secret: process.env.CLOUDINARY_API_SECRET, // Matches .env
  });
  
  console.log("✅ Cloudinary Configured");
};

export default connectCloudinary;