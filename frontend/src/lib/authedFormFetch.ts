// src/lib/api/authedFormFetch.ts
import { apiFetchForm } from "@/lib/apiFormClient";
import { getToken } from "@/lib/authSession";

export async function apiFetchFormAuthed<T>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const token = getToken();

    return apiFetchForm<T>(path, {
        ...init,
        headers: {
            ...(init.headers ?? {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}
