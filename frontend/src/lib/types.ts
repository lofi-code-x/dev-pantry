// src/lib/types.ts
export type UserRole = "admin" | "moderator" | "editor" | "user";

export type PublicUser = {
    id: number;
    login: string;
    role: UserRole;
};

export type AuthResponse = {
    token: string;
    user: PublicUser;
};

export type LoginRequest = {
    login: string;
    password: string;
};
