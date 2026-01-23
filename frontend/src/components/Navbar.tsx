// src/components/Navbar.tsx
import Link from "next/link";
import {NavbarAuth} from "@/components/NavbarAuth";

type NavItem = {
    href: string;
    label: string;
    icon: React.ReactNode;
};

function IconSearch(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path
                d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path
                d="M16.2 16.2 21 21"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function IconBook(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path
                d="M6 4.5h9.5A2.5 2.5 0 0 1 18 7v13.5H7.8A2.8 2.8 0 0 0 5 23V7a2.5 2.5 0 0 1 1-2.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M18 20.5H8"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function Navbar() {
    const items: NavItem[] = [
        {
            href: "/posts",
            label: "Explore",
            icon: <IconSearch className="h-4 w-4"/>,
        },
        {
            href: "/learn",
            label: "Learn",
            icon: <IconBook className="h-4 w-4"/>,
        },
    ];

    return (
        <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white">
            <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-4">
                {/* Left: brand -> home */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-neutral-950 hover:bg-neutral-50"
                >
          <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white">
            <span className="text-xs font-semibold tracking-tight text-neutral-950">
              DP
            </span>
          </span>
                    <span className="leading-none">Dev-Pantry</span>
                </Link>

                {/* Center: nav */}
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

                {/* Right: auth */}
                <div className="ml-auto">
                    <NavbarAuth/>
                </div>
            </div>
        </header>
    );
}
