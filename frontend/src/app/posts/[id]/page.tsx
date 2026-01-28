"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/apiClient";
import type { Post } from "@/lib/api/posts";
import {
    deletePost,
    getPost,
    setPostPublic,
    getPostModuleNav,
    type ModulePostNav,
} from "@/lib/api/posts";
import MdPreview from "@/components/posts/MdPreview";
import { useAuth } from "@/components/auth/AuthProvider";

// me api (только нужное)
import {
    addMyBookmark,
    removeMyBookmark,
    markMyReadCompleted,
    uncompleteMyRead,
    getMyPostState,
} from "@/lib/api/me";

// ✅ Icons (MUI)
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import PublicIcon from "@mui/icons-material/Public";
import LockIcon from "@mui/icons-material/Lock";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

// ✅ Module nav icons
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import MenuBookIcon from "@mui/icons-material/MenuBook";

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

const btnBase =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-fg " +
    "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

const btnBaseLeft =
    "inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-fg " +
    "hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring";

export default function PostPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const sp = useSearchParams();
    const { user, ready } = useAuth();

    const postId = Number(params.id);
    const staff = useMemo(() => (user ? isStaff(user.role) : false), [user]);

    const moduleIdFromQs = useMemo(() => {
        const raw = sp.get("module_id");
        if (!raw) return undefined;
        const n = Number(raw);
        return Number.isFinite(n) ? n : undefined;
    }, [sp]);

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(false);

    const [actionPending, setActionPending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // user-specific state
    const [saved, setSaved] = useState(false);
    const [completed, setCompleted] = useState(false);

    // module navigation
    const [nav, setNav] = useState<ModulePostNav | null>(null);
    const [navLoading, setNavLoading] = useState(false);

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
                if (cancelled) return;
                setSaved(Boolean(st.saved));
                setCompleted(Boolean(st.completed));
            } catch {
                // best-effort
            }
        }

        loadMeState();
        return () => {
            cancelled = true;
        };
    }, [ready, user, postId]);

    // ✅ load module nav (prev/next) via backend endpoint
    useEffect(() => {
        if (!Number.isFinite(postId)) return;

        let cancelled = false;

        async function loadNav() {
            setNav(null);
            setNavLoading(true);
            try {
                const n = await getPostModuleNav(postId, moduleIdFromQs);
                if (cancelled) return;
                setNav(n);
            } catch {
                if (cancelled) return;
                setNav(null);
            } finally {
                if (!cancelled) setNavLoading(false);
            }
        }

        loadNav();
        return () => {
            cancelled = true;
        };
    }, [postId, moduleIdFromQs]);

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
            setPost((prev) => (prev ? { ...prev, is_published: next } : prev));
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
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => router.back()} className={btnBaseLeft}>
                    <ArrowBackIcon sx={{ fontSize: 18 }} />
                    Back
                </button>

                <div className="flex flex-wrap items-center gap-2">
                    {/* User actions */}
                    {Number.isFinite(postId) ? (
                        <>
                            <button
                                type="button"
                                onClick={onToggleSaved}
                                disabled={actionPending}
                                className={btnBase}
                                title={saved ? "Remove from saved" : "Save post"}
                            >
                                {saved ? (
                                    <BookmarkIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                ) : (
                                    <BookmarkBorderIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                )}
                                {saved ? "Unsave" : "Save"}
                            </button>

                            <button
                                type="button"
                                onClick={onToggleCompleted}
                                disabled={actionPending}
                                className={btnBase}
                                title={completed ? "Mark as not completed" : "Mark post as completed"}
                            >
                                {completed ? (
                                    <RemoveCircleOutlineIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                ) : (
                                    <CheckCircleOutlineIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                )}
                                {completed ? "Uncomplete" : "Mark completed"}
                            </button>
                        </>
                    ) : null}

                    {/* Staff actions */}
                    {staff && post ? (
                        <>
                            <span className="mx-1 h-6 w-px bg-border" />

                            <Link href={`/posts/${postId}/edit`} className={btnBaseLeft}>
                                <EditIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                Edit post
                            </Link>

                            <button
                                type="button"
                                onClick={onTogglePublic}
                                disabled={actionPending}
                                className={btnBase}
                                title="Toggle public/private"
                            >
                                {post.is_published ? (
                                    <LockIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                ) : (
                                    <PublicIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                )}
                                {post.is_published ? "Make private" : "Make public"}
                            </button>

                            <button type="button" onClick={onDelete} disabled={actionPending} className={btnBase}>
                                <DeleteOutlineIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                Delete post
                            </button>
                        </>
                    ) : null}
                </div>
            </div>

            {/* ✅ Навигация по модулю (если пост входит в модуль) */}
            {nav ? (
                <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
                    {/* Prev */}
                    {nav.prev ? (
                        <Link
                            href={moduleIdFromQs ? `/posts/${nav.prev.id}?module_id=${nav.module_id}` : `/posts/${nav.prev.id}`}
                            className={cn(
                                "inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium",
                                "text-fg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                            )}
                            title={nav.prev.title}
                        >
                            <NavigateBeforeIcon sx={{ fontSize: 20 }} />
                            Prev
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className={cn(
                                "inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium",
                                "text-fg disabled:cursor-not-allowed disabled:opacity-60"
                            )}
                        >
                            <NavigateBeforeIcon sx={{ fontSize: 20 }} />
                            Prev
                        </button>
                    )}

                    {/* Module */}
                    <Link
                        href={`/learn/${nav.module_id}`}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium",
                            "text-fg hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring"
                        )}
                        title={`Open module #${nav.module_id}`}
                    >
                        <MenuBookIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                        <span className="text-fg">Module</span>
                    </Link>

                    {/* Next */}
                    {nav.next ? (
                        <Link
                            href={moduleIdFromQs ? `/posts/${nav.next.id}?module_id=${nav.module_id}` : `/posts/${nav.next.id}`}
                            className={cn(
                                "inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium",
                                "text-fg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                            )}
                            title={nav.next.title}
                        >
                            Next
                            <NavigateNextIcon sx={{ fontSize: 20 }} />
                        </Link>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className={cn(
                                "inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium",
                                "text-fg disabled:cursor-not-allowed disabled:opacity-60"
                            )}
                        >
                            Next
                            <NavigateNextIcon sx={{ fontSize: 20 }} />
                        </button>
                    )}

                    <div className="ml-auto text-xs text-muted-fg">{navLoading ? "Loading nav…" : null}</div>
                </div>
            ) : navLoading ? (
                <div className="mb-6 rounded-xl border border-border bg-card p-3 text-xs text-muted-fg shadow-sm">
                    Loading module navigation…
                </div>
            ) : null}

            {loading ? (
                <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <div className="text-sm text-muted-fg">Loading…</div>
                </section>
            ) : err ? (
                <section className="rounded-xl border border-border bg-muted p-6 shadow-sm">
                    <div className="text-sm text-fg">{err}</div>
                </section>
            ) : !post ? null : (
                <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
                    <header className="border-b border-border pb-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                            <span className="rounded-md border border-border bg-card px-2 py-1">{post.category_tag}</span>
                            <span>•</span>
                            <span className="truncate">by {post.author}</span>
                            <span>•</span>
                            <span>updated {formatDateTime(post.updated_at)}</span>

                            {staff ? (
                                <>
                                    <span>•</span>
                                    <span className="rounded-md border border-border bg-card px-2 py-1">
                    {post.is_published ? "public" : "private"}
                  </span>
                                </>
                            ) : null}
                        </div>

                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-fg">{post.title}</h1>

                        {post.preview_text ? <p className="mt-2 text-sm text-muted-fg">{post.preview_text}</p> : null}
                    </header>

                    <div className="pt-5">
                        <MdPreview source={post.content_markdown ?? ""} />
                    </div>
                </article>
            )}
        </main>
    );
}
