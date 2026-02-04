import { apiFetchAuthed } from "@/lib/authedFetch";

export type AdminUserListItem = {
    id: number;
    login: string;
    role: string;
    created_at: string;
    avatar_url: string | null;
};

export type AdminUserListResponse = {
    items: AdminUserListItem[];
    page: number;
    limit: number;
    total: number;
};

export type AdminDailyStat = {
    day: string;
    pageviews: number;
    pageviews_auth: number;
    pageviews_anon: number;
    unique_visitors: number;
    unique_auth: number;
    unique_anon: number;
};

export async function listAdminUsers(page = 1, limit = 50): Promise<AdminUserListResponse> {
    return apiFetchAuthed<AdminUserListResponse>(`/api/admin/users?page=${page}&limit=${limit}`, {
        method: "GET",
    });
}

export async function listAdminDailyStats(days = 30): Promise<AdminDailyStat[]> {
    return apiFetchAuthed<AdminDailyStat[]>(`/api/admin/stats/daily?days=${days}`, { method: "GET" });
}

export async function updateUserRole(userId: number, role: string): Promise<void> {
    await apiFetchAuthed<void>(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
    });
}

export async function deleteUser(userId: number): Promise<void> {
    await apiFetchAuthed<void>(`/api/admin/users/${userId}`, { method: "DELETE" });
}
