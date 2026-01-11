import mongoose, { Document, Model, Schema } from "mongoose";

// TypeScript interface for Version
export interface IVersion {
    projectId: mongoose.Types.ObjectId;
    versionNumber: number;
    canvasData: Record<string, unknown> | null;
    generatedHtml: string;
    createdAt: Date;
}

// Document interface (includes Mongoose methods)
export interface IVersionDocument extends IVersion, Document {
    _id: mongoose.Types.ObjectId;
}

const VersionSchema = new Schema<IVersionDocument>(
    {
        projectId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Project ID is required"],
            index: true,
        },
        versionNumber: {
            type: Number,
            required: [true, "Version number is required"],
        },
        canvasData: {
            type: Schema.Types.Mixed,
            default: null,
        },
        generatedHtml: {
            type: String,
            required: [true, "Generated HTML is required"],
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Compound index for efficient queries
VersionSchema.index({ projectId: 1, versionNumber: -1 });

// Prevent model recompilation in development
const Version: Model<IVersionDocument> =
    mongoose.models.Version || mongoose.model<IVersionDocument>("Version", VersionSchema);

export default Version;
