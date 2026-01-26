// src/components/modules/ModulePrimaryAction.tsx
"use client";

import Link from "next/link";
import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { UserRole } from "@/lib/types";

const STAFF_ROLES: UserRole[] = ["admin", "moderator", "editor"];

function isStaff(role: unknown) {
    return STAFF_ROLES.includes(String(role).toLowerCase() as UserRole);
}

function IconPlus(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function ModulePrimaryAction() {
    const { user } = useAuth();
    if (!user) return null;

    if (!isStaff(user.role)) return null;

    return (
        <Link
            href="/learn/new"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-950 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
        >
            <IconPlus className="h-4 w-4" />
            Create module
        </Link>
    );
}
