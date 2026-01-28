"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "dp-theme";

function getInitialTheme(): Theme {
    if (typeof document === "undefined") return "light";
    const t = document.documentElement.getAttribute("data-theme");
    return t === "dark" ? "dark" : "light";
}

function setTheme(theme: Theme) {
    document.documentElement.setAttribute("data-theme", theme);
    // чтобы системные контролы/скроллбар подстраивались
    document.documentElement.style.colorScheme = theme;
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
}

export function ThemeToggle() {
    const [theme, setThemeState] = useState<Theme>("light");

    useEffect(() => {
        // после маунта читаем то, что уже выставил inline-script в layout
        const t = getInitialTheme();
        setThemeState(t);
    }, []);

    function toggle() {
        const next: Theme = theme === "dark" ? "light" : "dark";
        setTheme(next);
        setThemeState(next);
    }

    const icon = theme === "dark" ? "dark_mode" : "light_mode";
    const title = theme === "dark" ? "Switch to light" : "Switch to dark";

    return (
        <button
            type="button"
            onClick={toggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-fg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            title={title}
            aria-label={title}
        >
            {/* Google Material Symbols */}
            <span className="material-symbols-rounded text-[20px] leading-none">
        {icon}
      </span>
        </button>
    );
}
