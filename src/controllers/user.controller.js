

import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async (userId) => {
    try {
       const user = await User.findById(userId);
       const accessToken = user.generateAccessTokens();
        const refreshToken = user.generateRefreshTokens();
        user.refreshTokens = refreshToken;
        await user.save({validateBeforeSave: false});
        return {accessToken, refreshToken};
    } catch (error) {
     throw new ApiError(500, 'Something went wrong while generating tokens');   
    }
}


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

const loginUser = asyncHandler(async (req, res) => {
    // Your login logic here
    // req body -> data
    // username or email
    // find the user
    // password compare
    // generate access token and refresh token
    // send cookies and response

    const {email,username, password} = req.body;
    if(!username && !email) {
        throw new ApiError(400, 'Username or email is required');
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    }).select('+password +refreshTokens');

    if(!user) {
        throw new ApiError(404, 'User not found');
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid) {
        throw new ApiError(401, 'Invalid user credentials');
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select('-password -refreshTokens');

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, {
            user: loggedInUser,
            accessToken,
            refreshToken
        }, 
        'User logged in successfully'));
   
});

const logoutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        { 
            $set: { refreshTokens: undefined }
        },
        { new: true })

        const options = {
            httpOnly: true,
            secure: true,
        };
        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, null, 'User logged out successfully'));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // Your refresh token logic here
    // get refresh token from cookies
    // verify refresh token
    // generate new access token
    // send response

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError(401, 'Refresh token not found, please login again');
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(404, 'Invalid refresh token, user not found');
        }
    
        if(user?.refreshTokens !== incomingRefreshToken) {
            throw new ApiError(401, 'Refresh token mismatch, please login again');
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
        
        const options = {
            httpOnly: true,
            secure: true,
        };
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, {
                accessToken,
                refreshToken: newRefreshToken
            }, 
            'Access token refreshed successfully'));
    } catch (error) {
        throw new ApiError(401, error?.message || 'Invalid refresh token');
    }

});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {currentPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    
    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

    if(!isPasswordCorrect) {
        throw new ApiError(400, 'Current and new passwords are required');
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res.status(200).json(new ApiResponse(200, null, 'Password changed successfully'));
});


const getCurrentUserProfile = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, 'Current user profile fetched successfully'));

});

const updateAccountDetails = asyncHandler(async (req, res) => {
    // get user id from req.user
    // get update data from req.body
    // validate data
    // find user and update
    // return response
    
    const {fullName, email} = req.body;


    if(!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: { fullName, email }
        },
        {new: true}
    ).select('-password -refreshTokens');


    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, 'User profile updated successfully'));



});

const updateUserAvatar = asyncHandler(async (req, res) => {
    // get user id from req.user
    // get avatar image from req.file
    // upload image to cloudinary
    // find user and update avatar field
    // return response

    const avatarLocalPath = req.file?.path;
    
    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar image is required');
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar?.secure_url) {
        throw new ApiError(400, 'Avatar image upload failed');
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: { avatar: avatar.url }
        },
        {new: true}
    ).select('-password -refreshTokens');

    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, 'Avatar updated successfully'));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // get user id from req.user
    // get avatar image from req.file
    // upload image to cloudinary
    // find user and update avatar field
    // return response

    const coverImageLocalPath = req.file?.path;
    
    if (!coverImageLocalPath) {
        throw new ApiError(400, 'Cover image is required');
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage?.secure_url) {
        throw new ApiError(400, 'Cover image upload failed');
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: { coverImage: coverImage.url }
        },
        {new: true}
    ).select('-password -refreshTokens');

    return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, 'Cover image updated successfully'));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "Username is Missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            },
        },
        {
            $lookup:{
                form: "Subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "Subscribers"
            }
        },
        {
            $lookup:{
                 form: "Subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "SubscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $cond: {
                        if: {$in: [req.user?._id, "subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }

            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                email: 1,
                coverImage: 1


            }
        }
    ])
    console.log(channel)

    if(!channel?.length){
        throw new ApiError(404, "Channel does not Exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0], "API feteched successfully")
    )
})

export {
    registerUser,
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUserProfile, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage
};