import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        // Validate required fields
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Connect to database
        await connectToDatabase();

        // Find user and explicitly select password field
        const user = await User.findOne({ email: email.toLowerCase() }).select(
            "+password"
        );

        if (!user) {
            // Use generic message to prevent email enumeration
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Compare passwords
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            // Use same generic message
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            );
        }

        // Return user data (without password)
        return NextResponse.json(
            {
                message: "Login successful",
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "An error occurred during login" },
            { status: 500 }
        );
    }
}
