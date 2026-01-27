// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import {NavbarAuth} from "@/components/NavbarAuth";

import SearchIcon from "@mui/icons-material/Search";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import Inventory2Icon from "@mui/icons-material/Inventory2";

type NavItem = {
    href: string;
    label: string;
    icon: React.ReactNode;
};

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function Navbar() {
    const items: NavItem[] = [
        {
            href: "/posts",
            label: "Explore",
            icon: <SearchIcon sx={{fontSize: 18}}/>,
        },
        {
            href: "/learn",
            label: "Learn",
            icon: <MenuBookIcon sx={{fontSize: 18}}/>,
        },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
            <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-neutral-950 hover:bg-neutral-50"
                >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white">
                        <Inventory2Icon  className="text-neutral-950"/>
                    </span>
                    <span className="leading-none">Dev-Pantry</span>
                </Link>

                <nav className="flex items-center gap-1">
                    {items.map((it) => (
                        <Link
                            key={it.href}
                            href={it.href}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                                "text-neutral-950 hover:bg-neutral-50",
                                "focus:outline-none focus:ring-2 focus:ring-neutral-200"
                            )}
                        >
                            <span className="text-neutral-700">{it.icon}</span>
                            <span className="font-medium">{it.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="ml-auto">
                    <NavbarAuth/>
                </div>
            </div>
        </header>
    );
}
