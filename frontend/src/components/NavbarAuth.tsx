// src/components/NavbarAuth.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

function IconUser(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M20 20.5c0-4-3.6-6.5-8-6.5s-8 2.5-8 6.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function IconLogout(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path
                d="M10 7V6a2.5 2.5 0 0 1 2.5-2.5H18A2.5 2.5 0 0 1 20.5 6v12A2.5 2.5 0 0 1 18 20.5h-5.5A2.5 2.5 0 0 1 10 18v-1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M3.5 12h10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M10.5 8.8 13.5 12l-3 3.2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

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

    // Закрытие по клику вне меню
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
                    "inline-flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                    "text-neutral-950 hover:bg-neutral-50",
                    "focus:outline-none focus:ring-2 focus:ring-neutral-200"
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
                    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white",
                    "text-sm font-semibold text-neutral-950 hover:bg-neutral-50",
                    "focus:outline-none focus:ring-2 focus:ring-neutral-200"
                )}
                title={user.login}
            >
                {initialLetter(user.login)}
            </button>

            {open ? (
                <div
                    role="menu"
                    className="absolute right-0 top-11 w-48 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
                >
                    <div className="border-b border-neutral-200 px-3 py-2">
                        <div className="text-sm font-semibold text-neutral-950">
                            {user.login}
                        </div>
                        <div className="text-xs text-neutral-600">{user.role}</div>
                    </div>

                    <Link
                        href="/me"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-950 hover:bg-neutral-50"
                    >
                        <IconUser className="h-4 w-4 text-neutral-700" />
                        View profile
                    </Link>

                    <button
                        type="button"
                        role="menuitem"
                        onClick={onLogout}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-950 hover:bg-neutral-50"
                    >
                        <IconLogout className="h-4 w-4 text-neutral-700" />
                        Log out
                    </button>
                </div>
            ) : null}
        </div>
    );
}
