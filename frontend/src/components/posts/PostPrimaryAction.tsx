// src/components/posts/PostPrimaryAction.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import type { UserRole } from "@/lib/types";
import CategoryManageModal from "@/components/category/CategoryManageModal";

import EditIcon from "@mui/icons-material/Edit";
import LightbulbOutlineIcon from "@mui/icons-material/LightbulbOutline";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";

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

export function PostPrimaryAction() {
    const { user } = useAuth();
    const [catOpen, setCatOpen] = useState(false);

    // гость: ничего
    if (!user) return null;

    const staff = isStaff(user.role);

    return (
        <div className="flex items-center gap-2">
            {/* New Post (staff) / Suggest (user) */}
            {staff ? (
                <Link href="/posts/new" className={cn("btn", ringHover)}>
                    <EditIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                    New post
                </Link>
            ) : (
                <Link href="/posts/suggest" className={cn("btn", ringHover)}>
                    <LightbulbOutlineIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                    Suggest post
                </Link>
            )}

            {/* New Category: staff only */}
            {staff ? (
                <>
                    <button type="button" onClick={() => setCatOpen(true)} className={cn("btn", ringHover)}>
                        <LocalOfferIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                        New category
                    </button>

                    <CategoryManageModal open={catOpen} onOpenChange={setCatOpen} />
                </>
            ) : null}
        </div>
    );
}
