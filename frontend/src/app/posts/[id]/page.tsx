// src/app/posts/[id]/page.tsx
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

// me api
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

/** Button hover WITHOUT lift (no jumping on reading page) */
const btnHover =
    "transition-[background-color,border-color,box-shadow] duration-150 " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/30 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

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

    // load user-specific state
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

    // load module nav
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
            {/* Top actions bar (NO jumping) */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => router.back()} className={cn("btn", btnHover)}>
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
                                className={cn("btn", btnHover, "disabled:cursor-not-allowed disabled:opacity-60")}
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
                                className={cn("btn", btnHover, "disabled:cursor-not-allowed disabled:opacity-60")}
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

                            <Link href={`/posts/${postId}/edit`} className={cn("btn", btnHover)}>
                                <EditIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                Edit post
                            </Link>

                            <button
                                type="button"
                                onClick={onTogglePublic}
                                disabled={actionPending}
                                className={cn("btn", btnHover, "disabled:cursor-not-allowed disabled:opacity-60")}
                            >
                                {post.is_published ? (
                                    <LockIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                ) : (
                                    <PublicIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                )}
                                {post.is_published ? "Make private" : "Make public"}
                            </button>

                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={actionPending}
                                className={cn(
                                    "btn",
                                    "disabled:cursor-not-allowed disabled:opacity-60",
                                    // delete hover (no lift)
                                    "transition-[background-color,border-color,box-shadow] duration-150",
                                    "hover:bg-[hsl(0_90%_55%/0.10)] hover:border-[hsl(0_90%_55%/0.45)]",
                                    "hover:ring-2 hover:ring-inset hover:ring-[hsl(0_90%_55%/0.28)]",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(0_90%_55%/0.45)]"
                                )}
                            >
                                <DeleteOutlineIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                Delete post
                            </button>
                        </>
                    ) : null}
                </div>
            </div>

            {/* ✅ Module nav (FIX: flex row, no jumping) */}
            {nav ? (
                <div
                    className={cn(
                        "mb-6 flex flex-wrap items-center gap-2",
                        "rounded-xl border border-border bg-card p-3 shadow-sm"
                    )}
                >
                    {/* Prev */}
                    {nav.prev ? (
                        <Link
                            href={
                                moduleIdFromQs
                                    ? `/posts/${nav.prev.id}?module_id=${nav.module_id}`
                                    : `/posts/${nav.prev.id}`
                            }
                            className={cn("btn", btnHover)}
                            title={nav.prev.title}
                        >
                            <NavigateBeforeIcon sx={{ fontSize: 20 }} />
                            Prev
                        </Link>
                    ) : (
                        <button type="button" disabled className={cn("btn", "disabled:cursor-not-allowed disabled:opacity-60")}>
                            <NavigateBeforeIcon sx={{ fontSize: 20 }} />
                            Prev
                        </button>
                    )}

                    {/* Module */}
                    <Link href={`/learn/${nav.module_id}`} className={cn("btn", btnHover)} title={`Open module #${nav.module_id}`}>
                        <MenuBookIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                        Module
                    </Link>

                    {/* Next */}
                    {nav.next ? (
                        <Link
                            href={
                                moduleIdFromQs
                                    ? `/posts/${nav.next.id}?module_id=${nav.module_id}`
                                    : `/posts/${nav.next.id}`
                            }
                            className={cn("btn", btnHover)}
                            title={nav.next.title}
                        >
                            Next
                            <NavigateNextIcon sx={{ fontSize: 20 }} />
                        </Link>
                    ) : (
                        <button type="button" disabled className={cn("btn", "disabled:cursor-not-allowed disabled:opacity-60")}>
                            Next
                            <NavigateNextIcon sx={{ fontSize: 20 }} />
                        </button>
                    )}

                    {/* status (keeps alignment) */}
                    <div className={cn("text-xs text-muted-fg whitespace-nowrap", "ml-0 sm:ml-auto")}>
                        {navLoading ? "Loading nav…" : null}
                    </div>
                </div>
            ) : navLoading ? (
                <div className="mb-6 rounded-xl border border-border bg-card p-3 text-xs text-muted-fg shadow-sm">
                    Loading module navigation…
                </div>
            ) : null}

            {/* Content */}
            {loading ? (
                <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-fg shadow-sm">
                    Loading…
                </section>
            ) : err ? (
                <section className="rounded-xl border border-border bg-muted p-6 text-sm text-fg shadow-sm">
                    {err}
                </section>
            ) : !post ? null : (
                // ✅ Reading area is STATIC: no hover ring, no lift
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
