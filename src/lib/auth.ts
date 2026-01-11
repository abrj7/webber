/**
 * Authentication Library
 * 
 * Uses MongoDB + Mongoose for user storage with bcrypt password hashing.
 * Frontend team can call these functions directly.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthResponse {
  user: User | null;
  error?: string;
}

// Store current user in memory (frontend should persist in localStorage/state)
let currentUser: User | null = null;

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { user: null, error: data.error || "Login failed" };
    }

    currentUser = data.user;
    return { user: data.user };
  } catch (error) {
    console.error("signIn error:", error);
    return { user: null, error: "Network error. Please try again." };
  }
}

/**
 * Sign up with name, email, and password
 * Password requirements: 8+ chars, 1 uppercase, 1 lowercase, 1 special char
 */
export async function signUp(name: string, email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { user: null, error: data.error || "Signup failed" };
    }

    currentUser = data.user;
    return { user: data.user };
  } catch (error) {
    console.error("signUp error:", error);
    return { user: null, error: "Network error. Please try again." };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  currentUser = null;
  // Clear any stored session data here if needed
}

/**
 * Get the currently logged in user
 */
export function getCurrentUser(): User | null {
  return currentUser;
}

/**
 * Set the current user (for restoring session from localStorage)
 */
export function setCurrentUser(user: User | null): void {
  currentUser = user;
}

// OAuth providers - not implemented yet
export async function signInWithGoogle(): Promise<AuthResponse> {
  return { user: null, error: "Google OAuth not implemented yet" };
}

export async function signInWithGitHub(): Promise<AuthResponse> {
  return { user: null, error: "GitHub OAuth not implemented yet" };
}
