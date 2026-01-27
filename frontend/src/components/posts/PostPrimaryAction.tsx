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
    return (STAFF_ROLES as readonly string[]).includes(String(role).toLowerCase() as any);
}

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

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
                <Link
                    href="/posts/new"
                    className={cn(
                        "inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                        "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    )}
                >
                    <EditIcon sx={{ fontSize: 18 }} />
                    New post
                </Link>
            ) : (
                <Link
                    href="/posts/suggest"
                    className={cn(
                        "inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-950",
                        "hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    )}
                >
                    <LightbulbOutlineIcon sx={{ fontSize: 18 }} className="text-neutral-700" />
                    Suggest post
                </Link>
            )}

            {/* New Category: staff only */}
            {staff ? (
                <>
                    <button
                        type="button"
                        onClick={() => setCatOpen(true)}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                            "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                        )}
                    >
                        <LocalOfferIcon sx={{ fontSize: 18 }} className="text-neutral-700" />
                        New Category
                    </button>

                    <CategoryManageModal open={catOpen} onOpenChange={setCatOpen} />
                </>
            ) : null}
        </div>
    );
}
