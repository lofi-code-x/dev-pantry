// src/lib/api/auth.ts
import { apiFetch } from "@/lib/apiClient";
import type { AuthResponse, LoginRequest } from "@/lib/types";

export async function loginApi(body: LoginRequest): Promise<AuthResponse> {
    return apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function signupApi(body: LoginRequest): Promise<AuthResponse | null> {
    return apiFetch<AuthResponse | null>("/auth/create", {
        method: "POST",
        body: JSON.stringify(body),
    });
}
