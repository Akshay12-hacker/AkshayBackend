import mongoose, {Schema} from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const videoSchema = new Schema(
    {
        videofile: {
            type: String, // cloudinary url
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        description: {
            type: String,
            required: false,
            trim: true,
        },
        thumbnail: {
            type: String, // cloudinary url
            required: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        duration: {
            type: Number, // duration in seconds
            required: true,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    }, {timestamps: true}
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model('Video', videoSchema);