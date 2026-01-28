// src/components/me/SavedBookmarksClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/apiClient";
import { listMyBookmarks, removeMyBookmark, type BookmarkedPost } from "@/lib/api/me";

// ✅ Google (MUI) icons
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function formatDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function BookmarkCard({
                          item,
                          onRemove,
                      }: {
    item: BookmarkedPost;
    onRemove: (postId: number) => void;
}) {
    const router = useRouter();

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/posts/${item.post_id}`)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") router.push(`/posts/${item.post_id}`);
            }}
            className={cn(
                "group cursor-pointer rounded-xl border border-border bg-card p-4 shadow-sm",
                "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-semibold text-fg group-hover:underline">{item.title}</div>

                    {item.preview_text ? (
                        <p className="mt-2 line-clamp-3 text-sm text-muted-fg">{item.preview_text}</p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                        <span className="rounded-md border border-border bg-muted px-2 py-0.5">{item.category_tag}</span>
                        <span>{item.author}</span>
                        <span>·</span>
                        <span>Updated {formatDate(item.updated_at)}</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(item.post_id);
                    }}
                    className={cn(
                        "shrink-0 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium",
                        "text-fg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    )}
                    title="Remove bookmark"
                    aria-label="Remove bookmark"
                >
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                    Remove
                </button>
            </div>
        </article>
    );
}

export default function SavedBookmarksClient() {
    const router = useRouter();
    const { user, ready } = useAuth();

    const [items, setItems] = useState<BookmarkedPost[]>([]);
    const [pending, setPending] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // guard: только для залогиненного
    useEffect(() => {
        if (!ready) return;
        if (!user) router.replace("/login");
    }, [ready, user, router]);

    useEffect(() => {
        if (!ready || !user) return;

        let cancelled = false;

        async function load() {
            setPending(true);
            setErr(null);
            try {
                // для страницы "Saved" обычно логично показывать всё, включая приватные
                const res = await listMyBookmarks({ only_published: false });
                if (!cancelled) setItems(res);
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError) setErr(e.message);
                else setErr("Failed to load bookmarks.");
            } finally {
                if (!cancelled) setPending(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [ready, user]);

    const count = useMemo(() => items.length, [items]);

    async function remove(postId: number) {
        try {
            await removeMyBookmark(postId);
            setItems((prev) => prev.filter((x) => x.post_id !== postId));
        } catch (e) {
            if (e instanceof ApiError) setErr(e.message);
            else setErr("Failed to remove bookmark.");
        }
    }

    if (!ready) return null;
    if (!user) return null;

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-6 flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold tracking-tight text-fg">Saved</h1>
                    <p className="mt-2 text-sm text-muted-fg">Your bookmarked posts. Total: {count}</p>
                </div>

                <button
                    type="button"
                    onClick={() => router.push("/me")}
                    className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium",
                        "text-fg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    )}
                >
                    <ArrowBackIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                    Back to profile
                </button>
            </header>

            {err ? (
                <div className="mb-4 rounded-xl border border-border bg-muted p-4 text-sm text-fg">{err}</div>
            ) : null}

            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
                {pending ? (
                    <div className="text-sm text-muted-fg">Loading…</div>
                ) : items.length === 0 ? (
                    <div className="text-sm text-muted-fg">No bookmarks yet.</div>
                ) : (
                    <div className="grid gap-3">
                        {items.map((it) => (
                            <BookmarkCard key={it.post_id} item={it} onRemove={remove} />
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
