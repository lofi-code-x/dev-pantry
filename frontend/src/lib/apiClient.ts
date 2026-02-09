export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

/**
 * Default: one-origin через reverse-proxy (Caddy/Nginx)
 * - API: /api
 * - Uploads: same origin (""), т.е. "/uploads/..."
 */
export const API_BASE =
    (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api").replace(/\/+$/, "");

export const UPLOADS_BASE =
    (process.env.NEXT_PUBLIC_API_BASE_UPLOADS_URL ?? "").replace(/\/+$/, "");

// export const API_BASE = "http://localhost:3001/api"
// export const UPLOADS_BASE = "http://localhost:3001"

/** join base + path without double-prefix (/api + /api/.. => /api/..) */
function joinUrl(base: string, path: string) {
    const b = (base ?? "").replace(/\/+$/, "");
    const p = path.startsWith("/") ? path : `/${path}`;

    if (!b) return p;

    // если path уже начинается с base, не дублируем
    if (p === b || p.startsWith(`${b}/`)) return p;

    if (b.startsWith("http://") || b.startsWith("https://")) return `${b}${p}`;

    return `${b}${p}`.replace(/\/{2,}/g, "/");
}

export function toAbsoluteUrl(url: string): string {
    const u = String(url ?? "").trim();
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://")) return u;

    // same-origin uploads: "" + "/uploads/.." => "/uploads/.."
    if (!UPLOADS_BASE) return u.startsWith("/") ? u : `/${u}`;

    // absolute uploads base
    return u.startsWith("/") ? `${UPLOADS_BASE}${u}` : `${UPLOADS_BASE}/${u}`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = joinUrl(API_BASE, path);

    const res = await fetch(url, {
        ...init,
        credentials: init.credentials ?? "include",
        headers: {
            ...(init.body ? {"Content-Type": "application/json"} : {}),
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
