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

const ringHover =
    "transition-[transform,background-color,border-color,box-shadow] duration-150 " +
    "hover:-translate-y-[1px] " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/30 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

export function ModulePrimaryAction() {
    const { user } = useAuth();
    if (!user) return null;
    if (!isStaff(user.role)) return null;

    return (
        <Link href="/learn/new" className={cn("btn", ringHover)}>
            <AddIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
            Create module
        </Link>
    );
}
