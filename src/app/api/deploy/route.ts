import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { cookies } from "next/headers";

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN || "";

// Calculate SHA1 hash for Vercel file upload
function sha1(content: string): string {
    return createHash("sha1").update(content).digest("hex");
}

export async function POST(req: Request) {
    try {
        const { html, projectName, pushToGitHub } = await req.json();

        if (!html) {
            return NextResponse.json({ error: "HTML content is required" }, { status: 400 });
        }

        if (!projectName) {
            return NextResponse.json({ error: "Project name is required" }, { status: 400 });
        }

        if (!VERCEL_API_TOKEN) {
            return NextResponse.json({ error: "Vercel API token not configured" }, { status: 500 });
        }

        // Sanitize project name (lowercase, alphanumeric and hyphens only)
        const sanitizedName = projectName
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 50);

        if (!sanitizedName) {
            return NextResponse.json({ error: "Invalid project name" }, { status: 400 });
        }

        let githubRepoUrl: string | null = null;
        let githubUsername: string | null = null;

        // If pushToGitHub is true, create GitHub repo first
        if (pushToGitHub) {
            const cookieStore = await cookies();
            const githubToken = cookieStore.get("github_token")?.value;

            if (!githubToken) {
                return NextResponse.json({
                    error: "Not authenticated with GitHub. Please sign in with GitHub first."
                }, { status: 401 });
            }

            // Get GitHub user info
            const userResponse = await fetch("https://api.github.com/user", {
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: "application/vnd.github.v3+json",
                },
            });

            if (!userResponse.ok) {
                return NextResponse.json({ error: "Failed to get GitHub user info" }, { status: 500 });
            }

            const userData = await userResponse.json();
            githubUsername = userData.login;

            // Create GitHub repository
            const createRepoResponse = await fetch("https://api.github.com/user/repos", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: "application/vnd.github.v3+json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: sanitizedName,
                    description: `Website created with Webber`,
                    public: true,
                    auto_init: false,
                }),
            });

            if (!createRepoResponse.ok) {
                const errorData = await createRepoResponse.json();
                console.error("GitHub repo creation failed:", errorData);
                return NextResponse.json({
                    error: errorData.message || "Failed to create GitHub repository"
                }, { status: 500 });
            }

            const repoData = await createRepoResponse.json();
            githubRepoUrl = repoData.html_url;

            // Create index.html file in the repo
            const createFileResponse = await fetch(
                `https://api.github.com/repos/${githubUsername}/${sanitizedName}/contents/index.html`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${githubToken}`,
                        Accept: "application/vnd.github.v3+json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: "Initial commit from Webber",
                        content: Buffer.from(html).toString("base64"),
                    }),
                }
            );

            if (!createFileResponse.ok) {
                const errorData = await createFileResponse.json();
                console.error("GitHub file creation failed:", errorData);
                return NextResponse.json({
                    error: "Failed to push code to GitHub repository"
                }, { status: 500 });
            }
        }

        // Deploy to Vercel
        let deploymentUrl: string;

        if (pushToGitHub && githubUsername) {
            // Deploy from GitHub repo
            const deployResponse = await fetch("https://api.vercel.com/v13/deployments", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${VERCEL_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: sanitizedName,
                    gitSource: {
                        type: "github",
                        repo: `${githubUsername}/${sanitizedName}`,
                        ref: "main",
                    },
                    projectSettings: {
                        framework: null,
                    },
                }),
            });

            const deployData = await deployResponse.json();

            if (!deployResponse.ok) {
                console.error("Vercel deployment from GitHub failed:", deployData);
                // Fallback to direct file deployment if GitHub deployment fails
                console.log("Falling back to direct file deployment...");
            } else {
                deploymentUrl = `https://${deployData.url}`;

                return NextResponse.json({
                    success: true,
                    url: deploymentUrl,
                    githubUrl: githubRepoUrl,
                    projectName: sanitizedName,
                });
            }
        }

        // Fallback or default: Deploy raw files to Vercel
        const htmlSha = sha1(html);

        const uploadResponse = await fetch("https://api.vercel.com/v2/files", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${VERCEL_API_TOKEN}`,
                "Content-Type": "application/octet-stream",
                "x-vercel-digest": htmlSha,
            },
            body: html,
        });

        if (!uploadResponse.ok && uploadResponse.status !== 409) {
            const errorText = await uploadResponse.text();
            console.error("File upload failed:", errorText);
            return NextResponse.json({ error: "Failed to upload file to Vercel" }, { status: 500 });
        }

        const deployResponse = await fetch("https://api.vercel.com/v13/deployments", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${VERCEL_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: sanitizedName,
                files: [
                    {
                        file: "index.html",
                        sha: htmlSha,
                        size: Buffer.byteLength(html, "utf8"),
                    },
                ],
                projectSettings: {
                    framework: null,
                },
            }),
        });

        const deployData = await deployResponse.json();

        if (!deployResponse.ok) {
            console.error("Deployment failed:", deployData);
            return NextResponse.json({
                error: deployData.error?.message || "Failed to create deployment"
            }, { status: 500 });
        }

        deploymentUrl = `https://${deployData.url}`;

        return NextResponse.json({
            success: true,
            url: deploymentUrl,
            githubUrl: githubRepoUrl,
            projectName: sanitizedName,
        });

    } catch (error: any) {
        console.error("Deploy API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
