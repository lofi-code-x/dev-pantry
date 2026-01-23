// src/lib/apiFormClient.ts
import {ApiError} from "@/lib/apiClient";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function apiFetchForm<T>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            // ВАЖНО: не ставим Content-Type, иначе сломаем multipart boundary
            ...(init.headers ?? {}),
        },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        const msg = text || `Request failed (${res.status})`;
        throw new ApiError(res.status, msg);
    }

    const text = await res.text().catch(() => "");
    if (!text) return null as any;

    try {
        return JSON.parse(text) as T;
    } catch {
        return text as any as T;
    }
}
