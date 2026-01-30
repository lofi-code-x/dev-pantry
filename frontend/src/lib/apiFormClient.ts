// src/lib/apiFormClient.ts
import {ApiError, API_BASE} from "@/lib/apiClient";

export async function apiFetchForm<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            // ВАЖНО: не ставим Content-Type, иначе сломаем multipart boundary
            ...(init.headers ?? {}),
        },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new ApiError(res.status, text || `Request failed (${res.status})`);
    }

    const text = await res.text().catch(() => "");
    if (!text) return null as any;

    try {
        return JSON.parse(text) as T;
    } catch {
        return text as any as T;
    }
}
