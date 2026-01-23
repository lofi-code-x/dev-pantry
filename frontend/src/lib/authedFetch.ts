// src/lib/api/authedFetch.ts
import { apiFetch } from "@/lib/apiClient";
import { getToken } from "@/lib/authSession";

export async function apiFetchAuthed<T>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const token = getToken();

    return apiFetch<T>(path, {
        ...init,
        headers: {
            ...(init.headers ?? {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}
