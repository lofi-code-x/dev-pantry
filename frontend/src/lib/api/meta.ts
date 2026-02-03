// src/lib/api/meta.ts
import { apiFetch } from "@/lib/apiClient";

export type Version = { version: string };

export async function getVersion(): Promise<Version> {
    return apiFetch<Version>("/api/meta/version");
}
