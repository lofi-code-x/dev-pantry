// src/lib/apiClient.ts
export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function apiFetch<T>(
    path: string,
    init: RequestInit = {}
): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(init.headers ?? {}),
        },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        const msg = text || `Request failed (${res.status})`;
        throw new ApiError(res.status, msg);
    }

    // Если тело пустое — возвращаем null
    const text = await res.text().catch(() => "");
    if (!text) return null as any;

    // Если это JSON — парсим
    try {
        return JSON.parse(text) as T;
    } catch {
        // На случай, если сервер вернул не-JSON текст (редко, но бывает)
        return text as any as T;
    }
}
