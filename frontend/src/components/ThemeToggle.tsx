// src/components/ThemeToggle.tsx
"use client";

import { useEffect, useState } from "react";

import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";

type Theme = "light" | "dark";
const STORAGE_KEY = "dp-theme";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function getInitialTheme(): Theme {
    if (typeof document === "undefined") return "light";
    const t = document.documentElement.getAttribute("data-theme");
    return t === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
    // Tailwind tokens
    document.documentElement.setAttribute("data-theme", theme);

    // @uiw/react-md-editor
    document.documentElement.setAttribute("data-color-mode", theme);
    document.body?.setAttribute("data-color-mode", theme);

    // system UI
    document.documentElement.style.colorScheme = theme;

    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
}

const ringHover =
    "transition-[transform,background-color,border-color,box-shadow] duration-150 " +
    "hover:-translate-y-[1px] " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/25 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

export function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>("light");

    useEffect(() => {
        // то, что выставил inline-script в layout
        setTheme(getInitialTheme());
    }, []);

    function toggle() {
        const next: Theme = theme === "dark" ? "light" : "dark";
        applyTheme(next);
        setTheme(next);
    }

    const title = theme === "dark" ? "Switch to light" : "Switch to dark";

    return (
        <button
            type="button"
            onClick={toggle}
            className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-fg",
                // subtle glossy feel
                "shadow-sm",
                ringHover
            )}
            title={title}
            aria-label={title}
        >
            {theme === "dark" ? <DarkModeIcon sx={{ fontSize: 17 }} /> : <LightModeIcon sx={{ fontSize: 17 }} />}
        </button>
    );
}
