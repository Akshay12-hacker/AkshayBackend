

import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
    // Your registration logic here
    // Get user data from frontend
    // Validate data - not empty
    // Check if user already exists: usename, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const {username, email, fullName, password} = req.body;
    // console.log("body", req.body);

    if(
        [fullName, username, email, password].some((field) => field?.trim() === '')
    ) {
        throw new ApiError(400, 'All fields are required');
    }
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

   if(existedUser) {
    throw new ApiError(409, 'Username or email already taken');
   }
   const avatarLocalPath = req.files?.avatar[0]?.path;

   let coverImageLocalPath;
   if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
       coverImageLocalPath = req.files.coverImage[0]?.path;
   }

   if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar image is required');
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coverImageLocalPath);

   if (!avatar?.secure_url) {
    throw new ApiError(400, 'Avatar image upload failed');
   }

    const user = await User.create({
        fullName,
        username: username.toLowerCase(),
        avatar: avatar.url,
        coverImage: coverImage?.url || '',
        email,
        password,
    });
    const createdUser = await User.findById(user._id).select('-password -refreshTokens');

    if(!createdUser) {
        throw new ApiError(500, 'User registration failed, please try again');
    }
    return res.status(201).json(new ApiResponse(200, createdUser, 'User registered successfully'));



});

export {registerUser};