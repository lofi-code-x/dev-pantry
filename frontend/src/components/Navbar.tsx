// src/components/Navbar.tsx
"use client";

import Link from "next/link";
import {NavbarAuth} from "@/components/NavbarAuth";

import SearchIcon from "@mui/icons-material/Search";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import {ThemeToggle} from "@/components/ThemeToggle";

type NavItem = { href: string; label: string; icon: React.ReactNode };

export function Navbar() {
    const items: NavItem[] = [
        {href: "/posts", label: "Explore", icon: <SearchIcon sx={{fontSize: 18}}/>},
        {href: "/learn", label: "Learn", icon: <MenuBookIcon sx={{fontSize: 18}}/>},
    ];

    return (
        <header className="topbar">
            <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-fg hover:bg-muted"
                >
          <span className="brand-badge">
            <Inventory2Icon className="text-fg"/>
          </span>
                    <span className="leading-none">Dev-Pantry</span>
                </Link>

                <nav className="flex items-center gap-1">
                    {items.map((it) => (
                        <Link key={it.href} href={it.href} className="nav-link">
                            <span className="text-muted-fg">{it.icon}</span>
                            <span className="font-medium">{it.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    <ThemeToggle/>
                    <NavbarAuth/>
                </div>
            </div>
        </header>
    );
}
