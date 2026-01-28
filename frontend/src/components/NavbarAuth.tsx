// src/components/NavbarAuth.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import LogoutIcon from "@mui/icons-material/Logout";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function initialLetter(login: string) {
    return (login.trim()[0] ?? "?").toUpperCase();
}

export function NavbarAuth() {
    const router = useRouter();
    const { user, logout } = useAuth();

    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!open) return;
            const el = rootRef.current;
            if (!el) return;
            if (e.target instanceof Node && !el.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [open]);

    function onLogout() {
        logout();
        setOpen(false);
        router.push("/");
        router.refresh();
    }

    if (!user) {
        return (
            <Link
                href="/login"
                className={cn(
                    "inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium",
                    "text-fg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                )}
            >
                LogIn
            </Link>
        );
    }

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card",
                    "text-sm font-semibold text-fg hover:bg-muted",
                    "focus:outline-none focus:ring-2 focus:ring-ring"
                )}
                title={user.login}
            >
                {initialLetter(user.login)}
            </button>

            {open ? (
                <div
                    role="menu"
                    className={cn(
                        "absolute right-0 top-11 w-48 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
                    )}
                >
                    <div className="border-b border-border px-3 py-2">
                        <div className="text-sm font-semibold text-fg">{user.login}</div>
                        <div className="text-xs text-muted-fg">{user.role}</div>
                    </div>

                    <Link
                        href="/me"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-fg hover:bg-muted"
                    >
                        <PersonOutlineIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                        View profile
                    </Link>

                    <Link
                        href="/me/saved"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-fg hover:bg-muted"
                    >
                        <BookmarkBorderIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                        Saved
                    </Link>

                    <button
                        type="button"
                        role="menuitem"
                        onClick={onLogout}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-muted"
                    >
                        <LogoutIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                        Log out
                    </button>
                </div>
            ) : null}
        </div>
    );
}
