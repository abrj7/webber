import mongoose, { Document, Model, Schema } from "mongoose";

// TypeScript interface for User
export interface IUser {
    name: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
}

// Document interface (includes Mongoose methods)
export interface IUserDocument extends IUser, Document {
    _id: mongoose.Types.ObjectId;
}

// User schema with security best practices
const UserSchema = new Schema<IUserDocument>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"],
            maxlength: [50, "Name cannot exceed 50 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                "Please enter a valid email address",
            ],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [8, "Password must be at least 8 characters"],
            select: false, // Never return password in queries by default
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
    }
);

// Prevent model recompilation in development (Next.js hot reload)
const User: Model<IUserDocument> =
    mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);

export default User;
