/**
 * Authentication Library
 * 
 * TODO: Implement authentication backend
 * 
 * This file should contain:
 * - signIn(email, password): Promise<User>
 * - signUp(name, email, password): Promise<User>
 * - signOut(): Promise<void>
 * - getCurrentUser(): User | null
 * - OAuth providers (Google, GitHub)
 * 
 * Suggested implementations:
 * - Firebase Auth
 * - NextAuth.js
 * - Supabase Auth
 * - Custom JWT with MongoDB
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// Placeholder functions - implement these with your auth provider

export async function signIn(email: string, password: string): Promise<User | null> {
  // TODO: Implement login logic
  console.log("signIn called with:", email);
  throw new Error("Not implemented - connect to auth provider");
}

export async function signUp(name: string, email: string, password: string): Promise<User | null> {
  // TODO: Implement signup logic
  console.log("signUp called with:", name, email);
  throw new Error("Not implemented - connect to auth provider");
}

export async function signOut(): Promise<void> {
  // TODO: Implement logout logic
  console.log("signOut called");
  throw new Error("Not implemented - connect to auth provider");
}

export function getCurrentUser(): User | null {
  // TODO: Check session/token for current user
  return null;
}

export async function signInWithGoogle(): Promise<User | null> {
  // TODO: Implement Google OAuth
  throw new Error("Not implemented - connect to auth provider");
}

export async function signInWithGitHub(): Promise<User | null> {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error("GitHub OAuth not configured");
  }

  // Redirect to GitHub OAuth
  const redirectUri = `${window.location.origin}/api/auth/github/callback`;
  const scope = "user:email repo"; // Request repo access for GitHub integration
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

  window.location.href = githubAuthUrl;
  return null;
}

// Helper function to get GitHub token from cookies
export function getGitHubToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  const tokenCookie = cookies.find((c) => c.trim().startsWith("github_token="));

  if (!tokenCookie) return null;
  return tokenCookie.split("=")[1];
}

// Helper function to get GitHub user from cookies
export function getGitHubUser(): { id: number; login: string; name: string; avatar_url: string } | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  const userCookie = cookies.find((c) => c.trim().startsWith("github_user="));

  if (!userCookie) return null;

  try {
    return JSON.parse(decodeURIComponent(userCookie.split("=")[1]));
  } catch {
    return null;
  }
}
