// src/components/auth/AuthProvider.tsx
"use client";

import React, {createContext, useContext, useEffect, useMemo, useState} from "react";
import type {PublicUser} from "@/lib/types";
import {getUser, clearSession} from "@/lib/authSession";

type AuthContextValue = {
    user: PublicUser | null;
    ready: boolean; // <-- добавили
    logout: () => void;
    setUser: (u: PublicUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: { children: React.ReactNode }) {
    const [user, setUser] = useState<PublicUser | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // читаем localStorage только на клиенте
        const u = getUser();
        setUser(u);
        setReady(true);
    }, []);

    function logout() {
        clearSession();
        setUser(null);
    }

    const value = useMemo(
        () => ({user, ready, logout, setUser}),
        [user, ready]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}