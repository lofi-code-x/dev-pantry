// src/components/auth/AuthProvider.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PublicUser } from "@/lib/types";
import { getUser, clearSession } from "@/lib/authSession";

type Theme = "light" | "dark";

const THEME_KEY = "dp-theme";

type AuthContextValue = {
    user: PublicUser | null;
    ready: boolean;
    logout: () => void;
    setUser: (u: PublicUser | null) => void;

    theme: Theme;
    setTheme: (t: Theme) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function applyTheme(theme: Theme) {
    // ✅ Tailwind tokens
    document.documentElement.setAttribute("data-theme", theme);

    // ✅ @uiw/react-md-editor
    document.documentElement.setAttribute("data-color-mode", theme);
    document.body?.setAttribute("data-color-mode", theme);

    // ✅ system UI (scrollbar/forms)
    document.documentElement.style.colorScheme = theme;
}

function loadTheme(): Theme {
    try {
        const raw = localStorage.getItem(THEME_KEY);
        if (raw === "dark" || raw === "light") return raw;
    } catch {}

    // fallback: what layout script already set
    const t = document.documentElement.getAttribute("data-theme");
    return t === "dark" ? "dark" : "light";
}

function saveTheme(theme: Theme) {
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<PublicUser | null>(null);
    const [ready, setReady] = useState(false);

    const [theme, _setTheme] = useState<Theme>("light");

    useEffect(() => {
        // init user
        const u = getUser();
        setUser(u);

        // init theme (from dp-theme or layout)
        const t = loadTheme();
        _setTheme(t);
        applyTheme(t);

        setReady(true);

        // sync theme between tabs/windows
        function onStorage(e: StorageEvent) {
            if (e.key !== THEME_KEY) return;
            const v = e.newValue;
            if (v === "dark" || v === "light") {
                _setTheme(v);
                applyTheme(v);
            }
        }
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
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
