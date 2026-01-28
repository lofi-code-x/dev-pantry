// src/components/auth/AuthProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PublicUser } from "@/lib/types";
import { getUser, clearSession } from "@/lib/authSession";

type Theme = "light" | "dark";

type AuthContextValue = {
    user: PublicUser | null;
    ready: boolean;
    logout: () => void;
    setUser: (u: PublicUser | null) => void;

    // theme (optional but useful)
    theme: Theme;
    setTheme: (t: Theme) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function applyTheme(t: Theme) {
    // html[data-theme="dark"] / html[data-theme="light"]
    document.documentElement.dataset.theme = t;
}

function loadTheme(): Theme {
    try {
        const raw = localStorage.getItem("theme");
        if (raw === "dark" || raw === "light") return raw;
    } catch {}
    return "light";
}

function saveTheme(t: Theme) {
    try {
        localStorage.setItem("theme", t);
    } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<PublicUser | null>(null);
    const [ready, setReady] = useState(false);

    const [theme, _setTheme] = useState<Theme>("light");

    useEffect(() => {
        // client-only init
        const u = getUser();
        setUser(u);

        const t = loadTheme();
        _setTheme(t);
        applyTheme(t);

        setReady(true);
    }, []);

    function setTheme(t: Theme) {
        _setTheme(t);
        applyTheme(t);
        saveTheme(t);
    }

    function logout() {
        clearSession();
        setUser(null);
    }

    const value = useMemo(
        () => ({ user, ready, logout, setUser, theme, setTheme }),
        [user, ready, theme]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
