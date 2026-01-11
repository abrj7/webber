import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Version from "@/lib/models/Version";

interface RouteContext {
    params: Promise<{ id: string }>;
}

// GET - List all versions for a project
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const { id: projectId } = await context.params;

        await connectToDatabase();

        const versions = await Version.find({ projectId })
            .sort({ versionNumber: -1 })
            .select("_id versionNumber createdAt")
            .limit(50);

        return NextResponse.json({ versions });
    } catch (error) {
        console.error("Error fetching versions:", error);
        return NextResponse.json(
            { error: "Failed to fetch versions" },
            { status: 500 }
        );
    }
}

// POST - Create new version (called after Generate)
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id: projectId } = await context.params;
        const body = await request.json();
        const { canvasData, generatedHtml } = body;

        if (!generatedHtml) {
            return NextResponse.json(
                { error: "Generated HTML is required" },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Get next version number
        const lastVersion = await Version.findOne({ projectId })
            .sort({ versionNumber: -1 })
            .select("versionNumber");

        const versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

        const version = await Version.create({
            projectId,
            versionNumber,
            canvasData,
            generatedHtml,
        });

        return NextResponse.json(
            {
                message: "Version created",
                version: {
                    id: version._id.toString(),
                    versionNumber: version.versionNumber,
                    createdAt: version.createdAt,
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating version:", error);
        return NextResponse.json(
            { error: "Failed to create version" },
            { status: 500 }
        );
    }
}
