// src/components/NavbarAuth.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { toAbsoluteUrl } from "@/lib/apiClient";
import { getPublicUserProfile } from "@/lib/api/user";

import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function initialLetter(login: string) {
    return (login.trim()[0] ?? "?").toUpperCase();
}

const ringHover =
    "transition-[transform,background-color,border-color,box-shadow] duration-150 " +
    "hover:-translate-y-[1px] " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/25 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

const menuItem =
    "flex items-center gap-2 px-3 py-2 text-sm text-fg " +
    "transition-[background-color,border-color,box-shadow] duration-150 " +
    "hover:bg-[hsl(var(--ring)/0.10)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

export function NavbarAuth() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const userId = user?.id ?? null;
    const userLogin = user?.login ?? null;

    const [open, setOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!open) return;
            const el = rootRef.current;
            if (!el) return;
            if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [open]);

    useEffect(() => {
        let cancelled = false;

        if (userId === null || !userLogin) {
            Promise.resolve().then(() => {
                if (!cancelled) setAvatarUrl(null);
            });
            return () => {
                cancelled = true;
            };
        }

        if (typeof window === "undefined") return;

        const key = `devpantry_avatar_url_${userId}`;
        Promise.resolve().then(() => {
            if (!cancelled) setAvatarUrl(localStorage.getItem(key));
        });

        void getPublicUserProfile(userLogin)
            .then((profile) => {
                if (cancelled) return;
                const fresh = profile.avatar_url;
                setAvatarUrl(fresh);

                if (fresh) {
                    localStorage.setItem(key, fresh);
                    return;
                }

                localStorage.removeItem(key);
            })
            .catch(() => {
                // ignore network/profile errors and keep cached avatar
            });

        return () => {
            cancelled = true;
        };
    }, [userId, userLogin]);

    function onLogout() {
        logout();
        setOpen(false);
        router.push("/");
        router.refresh();
    }

    if (!user) {
        return (
            <Link href="/login" className={cn("btn", ringHover)}>
                Log in
            </Link>
        );
    }

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => {
                    if (typeof window !== "undefined" && userId !== null) {
                        const key = `devpantry_avatar_url_${userId}`;
                        setAvatarUrl(localStorage.getItem(key));
                    }
                    setOpen((v) => !v);
                }}
                aria-haspopup="menu"
                aria-expanded={open}
                className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card overflow-hidden",
                    "text-sm font-semibold text-fg",
                    // чуть “глянца” на кнопке-аватарке
                    "shadow-sm",
                    ringHover
                )}
                title={user.login}
            >
                {avatarUrl ? (
                    <img
                        src={toAbsoluteUrl(avatarUrl)}
                        alt={`${user.login} avatar`}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    initialLetter(user.login)
                )}
            </button>

            {open ? (
                <div
                    role="menu"
                    className={cn(
                        "absolute right-0 top-11 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-lg",
                        // glossy/glass effect
                        "backdrop-blur",
                        "ring-1 ring-inset ring-border"
                    )}
                    style={{
                        background: "hsl(var(--card) / 0.92)",
                    }}
                >
                    <div className="border-b border-border px-3 py-2">
                        <div className="text-sm font-semibold text-fg">{user.login}</div>
                        <div className="text-xs text-muted-fg">{user.role}</div>
                    </div>

                    <Link
                        href="/me"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className={menuItem}
                    >
                        <PersonOutlineIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                        View profile
                    </Link>

                    {String(user.role).toLowerCase() === "admin" ? (
                        <Link
                            href="/admin"
                            role="menuitem"
                            onClick={() => setOpen(false)}
                            className={menuItem}
                        >
                            <AdminPanelSettingsIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                            Admin panel
                        </Link>
                    ) : null}

                    <Link
                        href="/me/saved"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className={menuItem}
                    >
                        <BookmarkBorderIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                        Saved
                    </Link>

                    <div className="border-t border-border" />

                    <button
                        type="button"
                        role="menuitem"
                        onClick={onLogout}
                        className={cn(menuItem, "w-full text-left")}
                    >
                        <LogoutIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                        Log out
                    </button>
                </div>
            ) : null}
        </div>
    );
}
