// src/lib/api/authedFetch.ts
import {apiFetch} from "@/lib/apiClient";
import {getToken} from "@/lib/authSession";

export async function apiFetchAuthed<T>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const token = getToken();
    
    const headers: Record<string, string> = {
        ...(init.headers instanceof Headers
            ? Object.fromEntries(init.headers.entries())
            : (init.headers as Record<string, string> | undefined) ?? {}),
    };
    
    if (init.body != null && !Object.keys(headers).some(k => k.toLowerCase() === "content-type")) {
        headers["Content-Type"] = "application/json";
    }

    if (token) headers["Authorization"] = `Bearer ${token}`;

    return apiFetch<T>(path, {
        ...init,
        headers,
        credentials: init.credentials ?? "include",
    });
}
