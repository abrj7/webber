import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        if (error) {
            console.error("GitHub OAuth error:", error);
            return NextResponse.redirect(new URL("/?error=github_auth_failed", req.url));
        }

        if (!code) {
            return NextResponse.json({ error: "No code provided" }, { status: 400 });
        }

        if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
            return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 500 });
        }

        // Exchange code for access token
        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                client_secret: GITHUB_CLIENT_SECRET,
                code,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            console.error("GitHub token exchange error:", tokenData);
            return NextResponse.redirect(new URL("/?error=github_token_failed", req.url));
        }

        const accessToken = tokenData.access_token;

        // Get user info
        const userResponse = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        const userData = await userResponse.json();

        // Store token in HTTP-only cookie (simple session management)
        const cookieStore = await cookies();
        cookieStore.set("github_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });

        // Store user info in cookie
        cookieStore.set("github_user", JSON.stringify({
            id: userData.id,
            login: userData.login,
            name: userData.name,
            avatar_url: userData.avatar_url,
        }), {
            httpOnly: false, // Allow client-side access
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
        });

        // Redirect to dashboard
        return NextResponse.redirect(new URL("/", req.url));
    } catch (error: any) {
        console.error("GitHub OAuth callback error:", error);
        return NextResponse.redirect(new URL("/?error=github_auth_error", req.url));
    }
}
