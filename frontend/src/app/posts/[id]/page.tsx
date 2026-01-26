"use client";

import React, {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useParams, useRouter} from "next/navigation";
import {ApiError} from "@/lib/apiClient";
import type {Post} from "@/lib/api/posts";
import {deletePost, getPost, setPostPublic} from "@/lib/api/posts";
import MdPreview from "@/components/posts/MdPreview";
import {useAuth} from "@/components/auth/AuthProvider";

// me api (только нужное)
import {
    addMyBookmark,
    removeMyBookmark,
    markMyReadCompleted,
    uncompleteMyRead,
    getMyPostState,
} from "@/lib/api/me";

const STAFF_ROLES = ["admin", "moderator", "editor"] as const;

function isStaff(role: unknown) {
    return (STAFF_ROLES as readonly string[]).includes(String(role).toLowerCase());
}

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function formatDateTime(iso: string) {
    try {
        return new Date(iso).toLocaleString("ru-RU", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

export default function PostPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const {user, ready} = useAuth();

    const postId = Number(params.id);
    const staff = useMemo(() => (user ? isStaff(user.role) : false), [user]);

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(false);

    const [actionPending, setActionPending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // user-specific state
    const [saved, setSaved] = useState(false);
    const [completed, setCompleted] = useState(false);

    // load post
    useEffect(() => {
        if (!Number.isFinite(postId)) {
            setErr("Invalid post id.");
            return;
        }

        let cancelled = false;

        async function load() {
            setErr(null);
            setLoading(true);
            try {
                const p = await getPost(postId);
                if (!cancelled) setPost(p);
            } catch (e) {
                if (cancelled) return;
                setErr(e instanceof ApiError ? e.message : "Failed to load post.");
                setPost(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [postId]);

    // ✅ load user-specific state: 1 lightweight call for this post only
    useEffect(() => {
        if (!ready) return;

        if (!user || !Number.isFinite(postId)) {
            setSaved(false);
            setCompleted(false);
            return;
        }

        let cancelled = false;

        async function loadMeState() {
            try {
                const st = await getMyPostState(postId);
                console.log(st);
                if (cancelled) return;
                setSaved(Boolean(st.saved));
                setCompleted(Boolean(st.completed));
            } catch {
                // не валим страницу — просто не показываем стейт
            }
        }

        loadMeState();
        return () => {
            cancelled = true;
        };
    }, [ready, user, postId]);

    async function onDelete() {
        if (!post) return;
        const ok = confirm(`Delete post "${post.title}"? This cannot be undone.`);
        if (!ok) return;

        setErr(null);
        setActionPending(true);
        try {
            await deletePost(postId);
            router.push("/posts");
            router.refresh();
        } catch (e) {
            setErr(e instanceof ApiError ? e.message : "Delete failed.");
        } finally {
            setActionPending(false);
        }
    }

    async function onTogglePublic() {
        if (!post) return;

        setErr(null);
        setActionPending(true);
        try {
            const next = !post.is_published;
            await setPostPublic(postId, next);
            setPost((prev) => (prev ? {...prev, is_published: next} : prev));
        } catch (e) {
            setErr(e instanceof ApiError ? e.message : "Update failed.");
        } finally {
            setActionPending(false);
        }
    }

    async function onToggleSaved() {
        if (!Number.isFinite(postId)) return;

        if (!ready) return;
        if (!user) {
            router.push("/login");
            return;
        }

        setErr(null);
        setActionPending(true);
        try {
            const next = !saved;
            if (next) await addMyBookmark(postId);
            else await removeMyBookmark(postId);
            setSaved(next);
        } catch (e) {
            setErr(e instanceof ApiError ? e.message : "Failed to update bookmark.");
        } finally {
            setActionPending(false);
        }
    }

    async function onToggleCompleted() {
        if (!Number.isFinite(postId)) return;

        if (!ready) return;
        if (!user) {
            router.push("/login");
            return;
        }

        setErr(null);
        setActionPending(true);
        try {
            const next = !completed;
            if (next) await markMyReadCompleted(postId);
            else await uncompleteMyRead(postId);
            setCompleted(next);
        } catch (e) {
            setErr(e instanceof ApiError ? e.message : "Failed to update progress.");
        } finally {
            setActionPending(false);
        }
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            {/* Управляющий бар */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className={cn(
                        "inline-flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                        "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    )}
                >
                    ← Back
                </button>

                <div className="flex flex-wrap items-center gap-2">
                    {/* User actions */}
                    {Number.isFinite(postId) ? (
                        <>
                            <button
                                type="button"
                                onClick={onToggleSaved}
                                disabled={actionPending}
                                className={cn(
                                    "inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                                    "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200",
                                    "disabled:cursor-not-allowed disabled:opacity-60"
                                )}
                                title={saved ? "Remove from saved" : "Save post"}
                            >
                                {saved ? "Unsave" : "Save"}
                            </button>

                            <button
                                type="button"
                                onClick={onToggleCompleted}
                                disabled={actionPending}
                                className={cn(
                                    "inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                                    "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200",
                                    "disabled:cursor-not-allowed disabled:opacity-60"
                                )}
                                title="Mark post as completed"
                            >
                                {completed ? "Uncomplete" : "Mark completed"}
                            </button>
                        </>
                    ) : null}

                    {/* Staff actions */}
                    {staff && post ? (
                        <>
                            <span className="mx-1 h-6 w-px bg-neutral-200"/>

                            <Link
                                href={`/posts/${postId}/edit`}
                                className={cn(
                                    "inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                                    "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                                )}
                            >
                                Edit post
                            </Link>

                            <button
                                type="button"
                                onClick={onTogglePublic}
                                disabled={actionPending}
                                className={cn(
                                    "inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                                    "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200",
                                    "disabled:cursor-not-allowed disabled:opacity-60"
                                )}
                                title="Toggle public/private"
                            >
                                {post.is_published ? "Make private" : "Make public"}
                            </button>

                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={actionPending}
                                className={cn(
                                    "inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                                    "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200",
                                    "disabled:cursor-not-allowed disabled:opacity-60"
                                )}
                            >
                                Delete post
                            </button>
                        </>
                    ) : null}
                </div>
            </div>

            {loading ? (
                <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="text-sm text-neutral-700">Loading…</div>
                </section>
            ) : err ? (
                <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm">
                    <div className="text-sm text-neutral-800">{err}</div>
                </section>
            ) : !post ? null : (
                <article className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <header className="border-b border-neutral-200 pb-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
              <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">
                {post.category_tag}
              </span>
                            <span>•</span>
                            <span className="truncate">by {post.author}</span>
                            <span>•</span>
                            <span>updated {formatDateTime(post.updated_at)}</span>

                            {staff ? (
                                <>
                                    <span>•</span>
                                    <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">
                    {post.is_published ? "public" : "private"}
                  </span>
                                </>
                            ) : null}
                        </div>

                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">
                            {post.title}
                        </h1>

                        {post.preview_text ? (
                            <p className="mt-2 text-sm text-neutral-700">{post.preview_text}</p>
                        ) : null}
                    </header>

                    <div className="pt-5">
                        <MdPreview source={post.content_markdown ?? ""}/>
                    </div>
                </article>
            )}
        </main>
    );
}
