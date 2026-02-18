// src/app/posts/[id]/edit/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/apiClient";
import type { PostCreateRequest } from "@/lib/api/posts";
import { getPost } from "@/lib/api/posts";
import PostEditor from "@/components/posts/PostEditor";

const STAFF_ROLES = ["admin", "moderator", "editor"] as const;

function isStaff(role: unknown) {
    return (STAFF_ROLES as readonly string[]).includes(String(role).toLowerCase());
}

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export default function EditPostPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuth();

    const id = Number(params.id);

    const staff = useMemo(() => (user ? isStaff(user.role) : false), [user]);

    const [initial, setInitial] = useState<Partial<PostCreateRequest> | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            router.replace("/login");
            return;
        }
        if (!staff) {
            router.replace("/posts");
            return;
        }
    }, [user, staff, router]);

    useEffect(() => {
        if (!staff) return;
        if (!Number.isFinite(id)) {
            setErr("Invalid post id.");
            return;
        }

        let cancelled = false;

        async function load() {
            setErr(null);
            try {
                const p = await getPost(id);
                if (cancelled) return;

                setInitial({
                    title: p.title,
                    category_tag: p.category_tag,
                    content_markdown: p.content_markdown,
                    author: p.author,
                });
            } catch (e) {
                if (cancelled) return;
                setErr(e instanceof ApiError ? e.message : "Failed to load post.");
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [id, staff]);

    if (!user) return null;
    if (!staff) return null;

    if (err) {
        return (
            <main className="mx-auto w-full max-w-6xl px-6 py-10">
                <section
                    className={cn(
                        "surface p-6",
                        "ring-1 ring-inset ring-ring/15",
                        "bg-[hsl(var(--ring)/0.06)]"
                    )}
                >
                    <div className="text-sm text-fg">{err}</div>
                </section>
            </main>
        );
    }

    if (!initial) return null;

    return <PostEditor mode="edit" postId={id} initial={initial} />;
}
