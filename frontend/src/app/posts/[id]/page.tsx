// src/app/posts/[id]/page.tsx
"use client";

import React, {useEffect, useMemo, useState, useRef} from "react";
import Link from "next/link";
import {useParams, useRouter, useSearchParams} from "next/navigation";
import {ApiError} from "@/lib/apiClient";
import type {Post} from "@/lib/api/posts";
import {
    deletePost,
    getPost,
    getPostQuiz,
    getPostQuizAttempt,
    setPostPublic,
    submitPostQuiz,
    getPostModuleNav,
    type QuizQuestion,
    type ModulePostNav,
} from "@/lib/api/posts";
import MdPreview from "@/components/posts/MdPreview";
import {useAuth} from "@/components/auth/AuthProvider";

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
    const {user, ready} = useAuth();

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

    const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizErr, setQuizErr] = useState<string | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<Map<number, number>>(new Map());
    const [quizPending, setQuizPending] = useState(false);
    const [quizResult, setQuizResult] = useState<string | null>(null);
    const [quizAttemptLoaded, setQuizAttemptLoaded] = useState(false);

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

    // load quiz
    useEffect(() => {
        if (!Number.isFinite(postId)) return;

        let cancelled = false;

        async function loadQuiz() {
            setQuizLoading(true);
            setQuizErr(null);
            try {
                const qs = await getPostQuiz(postId);
                if (cancelled) return;
                setQuiz(qs ?? []);
            } catch (e) {
                if (cancelled) return;
                setQuizErr(e instanceof ApiError ? e.message : "Failed to load quiz.");
                setQuiz([]);
            } finally {
                if (!cancelled) setQuizLoading(false);
            }
        }

        loadQuiz();
        return () => {
            cancelled = true;
        };
    }, [postId]);

    // load last quiz attempt (prefill)
    useEffect(() => {
        if (!ready) return;
        if (!user) {
            setQuizAttemptLoaded(false);
            setQuizAnswers(new Map());
            return;
        }
        if (!Number.isFinite(postId)) return;

        let cancelled = false;

        async function loadAttempt() {
            try {
                const attempt = await getPostQuizAttempt(postId);
                if (cancelled) return;
                if (attempt?.answers?.length) {
                    const next = new Map<number, number>();
                    for (const a of attempt.answers) {
                        next.set(a.question_id, a.option_id);
                    }
                    setQuizAnswers(next);
                    setQuizResult(attempt.is_passed ? "✅ Previously passed." : null);
                }
                setQuizAttemptLoaded(true);
            } catch {
                if (!cancelled) setQuizAttemptLoaded(true);
            }
        }

        loadAttempt();
        return () => {
            cancelled = true;
        };
    }, [ready, user, postId]);

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

    // ✅ show header divider only when the "top panel" exists
    const hasTopPanel = Boolean(nav || navLoading || staff);

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

    async function onSubmitQuiz() {
        if (!Number.isFinite(postId)) return;
        if (!ready) return;
        if (!user) {
            router.push("/login");
            return;
        }

        const answers = quiz.map((q) => ({
            question_id: q.id,
            option_id: quizAnswers.get(q.id),
        }));

        if (answers.some((a) => typeof a.option_id !== "number")) {
            setQuizResult("Answer all questions to submit.");
            return;
        }

        setQuizPending(true);
        setQuizResult(null);
        try {
            const res = await submitPostQuiz(postId, {
                answers: answers as { question_id: number; option_id: number }[],
            });
            if (res.is_passed) {
                setQuizResult("✅ Correct! Post marked as completed.");
                setCompleted(true);
            } else {
                setQuizResult("❌ Not all answers are correct. Try again.");
            }
        } catch (e) {
            setQuizResult(e instanceof ApiError ? e.message : "Failed to submit quiz.");
        } finally {
            setQuizPending(false);
        }
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
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
                <>
                    <section className="mb-6 rounded-xl border border-border bg-card p-6 shadow-sm">
                        <div className={cn(hasTopPanel && "border-b border-border pb-4")}>
                            <h1 className="text-2xl font-semibold tracking-tight text-fg">{post.title}</h1>
                            <div
                                className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-fg">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-md border border-border bg-card px-2 py-1">
                                        {post.category_tag}
                                    </span>
                                    <span>•</span>
                                    <Link
                                        href={`/user/${encodeURIComponent(post.author)}`}
                                        className="truncate font-medium text-fg/90 underline decoration-dotted underline-offset-2 hover:text-fg hover:decoration-solid"
                                    >
                                        by {post.author}
                                    </Link>
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

                                {Number.isFinite(postId) ? (
                                    <button
                                        type="button"
                                        onClick={onToggleSaved}
                                        disabled={actionPending}
                                        className={cn(
                                            "btn",
                                            btnHover,
                                            "h-8 px-3 py-1 text-xs",
                                            "disabled:cursor-not-allowed disabled:opacity-60"
                                        )}
                                        title={saved ? "Remove from saved" : "Save post"}
                                    >
                                        {saved ? (
                                            <BookmarkIcon sx={{fontSize: 16}} className="text-muted-fg"/>
                                        ) : (
                                            <BookmarkBorderIcon sx={{fontSize: 16}} className="text-muted-fg"/>
                                        )}
                                        {saved ? "Unsave" : "Save"}
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        {hasTopPanel ? (
                            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                    {nav ? (
                                        <>
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
                                                    <NavigateBeforeIcon sx={{fontSize: 20}}/>
                                                    Prev
                                                </Link>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled
                                                    className={cn(
                                                        "btn",
                                                        "disabled:cursor-not-allowed disabled:opacity-60"
                                                    )}
                                                >
                                                    <NavigateBeforeIcon sx={{fontSize: 20}}/>
                                                    Prev
                                                </button>
                                            )}

                                            <Link
                                                href={`/learn/${nav.module_id}`}
                                                className={cn("btn", btnHover)}
                                                title={`Open module #${nav.module_id}`}
                                            >
                                                <MenuBookIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                                Module
                                            </Link>

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
                                                    <NavigateNextIcon sx={{fontSize: 20}}/>
                                                </Link>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled
                                                    className={cn(
                                                        "btn",
                                                        "disabled:cursor-not-allowed disabled:opacity-60"
                                                    )}
                                                >
                                                    Next
                                                    <NavigateNextIcon sx={{fontSize: 20}}/>
                                                </button>
                                            )}

                                            {navLoading ? (
                                                <span className="ml-2 text-xs text-muted-fg">Loading nav…</span>
                                            ) : null}
                                        </>
                                    ) : navLoading ? (
                                        <span className="text-xs text-muted-fg">Loading module navigation…</span>
                                    ) : null}
                                </div>

                                {staff && post ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Link href={`/posts/${postId}/edit`} className={cn("btn", btnHover)}>
                                            <EditIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                            Edit post
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={onTogglePublic}
                                            disabled={actionPending}
                                            className={cn(
                                                "btn",
                                                btnHover,
                                                "disabled:cursor-not-allowed disabled:opacity-60"
                                            )}
                                        >
                                            {post.is_published ? (
                                                <LockIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                            ) : (
                                                <PublicIcon sx={{fontSize: 18}} className="text-muted-fg"/>
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
                                                "transition-[background-color,border-color,box-shadow] duration-150",
                                                "hover:bg-[hsl(0_90%_55%/0.10)] hover:border-[hsl(0_90%_55%/0.45)]",
                                                "hover:ring-2 hover:ring-inset hover:ring-[hsl(0_90%_55%/0.28)]",
                                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(0_90%_55%/0.45)]"
                                            )}
                                        >
                                            <DeleteOutlineIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                            Delete post
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </section>

                    <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
                        <MdPreview source={post.content_markdown ?? ""}/>
                    </article>

                    <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
                        {quizLoading ? (
                            <div className="text-sm text-muted-fg">Loading quiz…</div>
                        ) : quizErr ? (
                            <div className="rounded-lg border border-border bg-muted p-3 text-sm text-fg">
                                {quizErr}
                            </div>
                        ) : quiz.length === 0 ? (
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="text-sm text-muted-fg">No quiz for this post.</div>
                                <button
                                    type="button"
                                    onClick={onToggleCompleted}
                                    disabled={actionPending}
                                    className={cn("btn", btnHover, "disabled:cursor-not-allowed disabled:opacity-60")}
                                    title={completed ? "Mark as not completed" : "Mark post as completed"}
                                >
                                    {completed ? (
                                        <RemoveCircleOutlineIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                    ) : (
                                        <CheckCircleOutlineIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                    )}
                                    {completed ? "Uncomplete" : "Mark completed"}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-sm font-medium text-fg">Quiz</div>

                                {quiz.map((q, qi) => (
                                    <div
                                        key={q.id}
                                        className={cn(
                                            "rounded-lg border border-border p-4",
                                            "bg-[hsl(var(--ring)/0.03)]"
                                        )}
                                    >
                                        <div className="mb-2 text-sm font-medium text-fg">
                                            {qi + 1}. {q.question_text}
                                        </div>
                                        <div className="space-y-2">
                                            {q.options.map((opt) => (
                                                <label
                                                    key={opt.id}
                                                    className="flex items-center gap-2 text-sm text-fg"
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`q-${q.id}`}
                                                        checked={quizAnswers.get(q.id) === opt.id}
                                                        onChange={() =>
                                                            setQuizAnswers((prev) => {
                                                                const next = new Map(prev);
                                                                next.set(q.id, opt.id);
                                                                return next;
                                                            })
                                                        }
                                                        disabled={quizPending}
                                                    />
                                                    {opt.option_text}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {quizResult ? (
                                    <div className="text-sm text-muted-fg">{quizResult}</div>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={onSubmitQuiz}
                                    disabled={quizPending}
                                    className={cn(
                                        "btn px-4 py-2",
                                        btnHover,
                                        "disabled:cursor-not-allowed disabled:opacity-60"
                                    )}
                                >
                                    {quizPending ? "Checking..." : "Submit answers"}
                                </button>
                            </div>
                        )}
                    </section>
                </>
            )}
        </main>
    );
}
