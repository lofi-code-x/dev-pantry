// src/lib/authSession.ts
import type {AuthResponse, PublicUser, UserRole} from "@/lib/types";

const TOKEN_KEY = "devpantry_token";
const USER_KEY = "devpantry_user";


export function saveSession(auth: AuthResponse) {
    if (typeof window === "undefined") return;

    const user: PublicUser = {
        ...auth.user,
        role: normalizeRole((auth.user as any).role),
    };

    localStorage.setItem(TOKEN_KEY, auth.token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
    return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function getUser(): PublicUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as any;
        if (typeof parsed?.id !== "number" || typeof parsed?.login !== "string") return null;

        return {
            id: parsed.id,
            login: parsed.login,
            role: normalizeRole(parsed.role),
        };
    } catch {
        return null;
    }
}

function normalizeRole(role: unknown): UserRole {
    const r = String(role ?? "").trim().toLowerCase();
    if (r === "admin" || r === "moderator" || r === "editor" || r === "user") return r;
    return "user";
}
