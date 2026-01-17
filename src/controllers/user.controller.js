import {asyncHandler} from '../utils/asyncHandler.js';

const registerUser = asyncHandler(async (req, res) => {

    res.status(200).json({
        message: "Hello User..",
        data: req.body
    });
});


export {registerUser};