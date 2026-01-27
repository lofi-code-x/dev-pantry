// src/components/modules/ModulePrimaryAction.tsx
"use client";

import Link from "next/link";
import React from "react";
import {useAuth} from "@/components/auth/AuthProvider";
import type {UserRole} from "@/lib/types";

import AddIcon from "@mui/icons-material/Add";

const STAFF_ROLES: UserRole[] = ["admin", "moderator", "editor"];

function isStaff(role: unknown) {
    return STAFF_ROLES.includes(String(role).toLowerCase() as UserRole);
}

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function ModulePrimaryAction() {
    const {user} = useAuth();
    if (!user) return null;

    if (!isStaff(user.role)) return null;

    return (
        <Link
            href="/learn/new"
            className={cn(
                "inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
            )}
        >
            <AddIcon sx={{fontSize: 18}}/>
            Create module
        </Link>
    );
}
