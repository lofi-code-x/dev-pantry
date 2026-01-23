// src/components/posts/PostPrimaryAction.tsx
"use client";

import React, {useState} from "react";
import Link from "next/link";
import {useAuth} from "@/components/auth/AuthProvider";
import type {UserRole} from "@/lib/types";
import CategoryManageModal from "@/components/category/CategoryManageModal";

function IconPencil(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path
                d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-.2-.2a2 2 0 0 0-2.8 0L5 17v3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M13.5 6.5 17.5 10.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function IconIdea(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path
                d="M12 3a7 7 0 0 0-4 12.7V18a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3A7 7 0 0 0 12 3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M9 23h6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function IconTag(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path
                d="M20 13 11 22 2 13V2h11l7 7v4Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <path
                d="M7.5 7.5h.01"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
            />
        </svg>
    );
}

const STAFF_ROLES: UserRole[] = ["admin", "moderator", "editor"];

function isStaff(role: unknown) {
    return (STAFF_ROLES as readonly string[]).includes(String(role).toLowerCase() as any);
}

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function PostPrimaryAction() {
    const {user} = useAuth();
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
                    <IconPencil className="h-4 w-4"/>
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
                    <IconIdea className="h-4 w-4 text-neutral-700"/>
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
                        <IconTag className="h-4 w-4 text-neutral-700"/>
                        New Category
                    </button>

                    <CategoryManageModal open={catOpen} onOpenChange={setCatOpen}/>
                </>
            ) : null}
        </div>
    );
}
