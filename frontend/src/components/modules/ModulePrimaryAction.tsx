// src/components/modules/ModulePrimaryAction.tsx
"use client";

import Link from "next/link";
import React from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import type { UserRole } from "@/lib/types";

import AddIcon from "@mui/icons-material/Add";

const STAFF_ROLES: UserRole[] = ["admin", "moderator", "editor"];

function isStaff(role: unknown) {
    return STAFF_ROLES.includes(String(role).toLowerCase() as UserRole);
}

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function ModulePrimaryAction() {
    const { user } = useAuth();
    if (!user) return null;
    if (!isStaff(user.role)) return null;

    return (
        <Link
            href="/learn/new"
            className={cn(
                "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium",
                "text-fg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            )}
        >
            <AddIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
            Create module
        </Link>
    );
}
