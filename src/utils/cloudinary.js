import { v2 as cloudinary } from "cloudinary";
import { response } from "express";
import fs from "fs";
import path from "path";


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (filePath) => {
  try {
    if(!filePath) return null
    cloudinary.uploader.upload(filePath, {
      resource_type: "auto",
    })
    // file has been uploaded successfully
    console.log("File uploaded to Cloudinary successfully", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(filePath); //remove the locally saved temp file as the upload operation got failed
    return null;
  }
}

export {uploadOnCloudinary}