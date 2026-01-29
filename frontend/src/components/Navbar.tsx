// src/components/Navbar.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavbarAuth } from "@/components/NavbarAuth";
import { ThemeToggle } from "@/components/ThemeToggle";

import SearchIcon from "@mui/icons-material/Search";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import HomeIcon from "@mui/icons-material/Home";

type NavItem = { href: string; label: string; icon: React.ReactNode };

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
}

export function Navbar() {
    const pathname = usePathname();

    const items: NavItem[] = [
        { href: "/", label: "Home", icon: <HomeIcon sx={{ fontSize: 18 }} /> },
        { href: "/posts", label: "Explore", icon: <SearchIcon sx={{ fontSize: 18 }} /> },
        { href: "/learn", label: "Learn", icon: <MenuBookIcon sx={{ fontSize: 18 }} /> },
    ];

    return (
        <header className="topbar">
            <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
                <nav className="flex items-center gap-1">
                    {items.map((it) => {
                        const active = isActive(pathname, it.href);

                        return (
                            <Link
                                key={it.href}
                                href={it.href}
                                className={cn(
                                    "nav-link",
                                    // ✅ hover как ring (без bg-muted)
                                    "transition-[transform,background-color,border-color,box-shadow] duration-150",
                                    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)]",
                                    "hover:ring-2 hover:ring-inset hover:ring-ring/25 hover:-translate-y-[1px]",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55",
                                    active && "nav-link-active"
                                )}
                            >
                <span
                    className={cn(
                        "nav-icon",
                        "transition-colors",
                        active && "text-fg"
                    )}
                >
                  {it.icon}
                </span>
                                <span className="font-medium">{it.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    <ThemeToggle />
                    <NavbarAuth />
                </div>
            </div>
        </header>
    );
}
