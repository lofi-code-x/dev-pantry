import { apiFetch } from "@/lib/apiClient";

export type PublicUserContacts = {
    email: string | null;
    website: string | null;
    github: string | null;
    telegram: string | null;
};

export type PublicUserStats = {
    total_xp: number;
    posts_completed: number;
    modules_completed: number;
};

export type PublicUserProfile = {
    login: string;
    role: string;
    avatar_url: string | null;
    contacts: PublicUserContacts;
    stats: PublicUserStats;
};

// GET /api/user/{login}
export async function getPublicUserProfile(login: string): Promise<PublicUserProfile> {
    const safe = encodeURIComponent(login);
    return apiFetch<PublicUserProfile>(`/api/user/${safe}`, { method: "GET" });
}
