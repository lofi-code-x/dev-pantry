import { apiFetch } from "@/lib/apiClient";

export type LeaderboardUser = {
    login: string;
    avatar_url: string | null;
    total_xp: number;
};

// GET /api/leaderboard
export async function listLeaderboard(): Promise<LeaderboardUser[]> {
    return apiFetch<LeaderboardUser[]>("/api/leaderboard", { method: "GET" });
}
