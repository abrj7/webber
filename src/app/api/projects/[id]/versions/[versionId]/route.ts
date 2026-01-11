import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Version from "@/lib/models/Version";
import Project from "@/lib/models/Project";

interface RouteContext {
    params: Promise<{ id: string; versionId: string }>;
}

// GET - Get specific version data
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { versionId } = await context.params;

        await connectToDatabase();

        const version = await Version.findById(versionId);

        if (!version) {
            return NextResponse.json(
                { error: "Version not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            version: {
                id: version._id.toString(),
                projectId: version.projectId.toString(),
                versionNumber: version.versionNumber,
                canvasData: version.canvasData,
                generatedHtml: version.generatedHtml,
                createdAt: version.createdAt,
            },
        });
    } catch (error) {
        console.error("Error fetching version:", error);
        return NextResponse.json(
            { error: "Failed to fetch version" },
            { status: 500 }
        );
    }
}

// POST - Restore this version (copies data back to project)
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id: projectId, versionId } = await context.params;

        await connectToDatabase();

        const version = await Version.findById(versionId);

        if (!version) {
            return NextResponse.json(
                { error: "Version not found" },
                { status: 404 }
            );
        }

        // Update project with version data
        const project = await Project.findByIdAndUpdate(
            projectId,
            {
                $set: {
                    canvasData: version.canvasData,
                    generatedHtml: version.generatedHtml,
                },
            },
            { new: true }
        );

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: `Restored to version ${version.versionNumber}`,
            project: {
                id: project._id.toString(),
                canvasData: project.canvasData,
                generatedHtml: project.generatedHtml,
            },
        });
    } catch (error) {
        console.error("Error restoring version:", error);
        return NextResponse.json(
            { error: "Failed to restore version" },
            { status: 500 }
        );
    }
}
