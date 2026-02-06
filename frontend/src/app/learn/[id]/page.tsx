// src/app/learn/[id]/page.tsx
"use client";

import React, {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {notFound, useParams, useRouter} from "next/navigation";
import {useAuth} from "@/components/auth/AuthProvider";
import {ApiError, toAbsoluteUrl} from "@/lib/apiClient";
import {
    deleteModule,
    getModulePosts,
    setModulePublic,
    type Module,
    type ModuleSectionPosts,
    getModule,
} from "@/lib/api/modules";
import type {UserRole} from "@/lib/types";
import {PostCard} from "@/components/posts/PostCard";
import {listMyReads} from "@/lib/api/me";
import {listModuleImages} from "@/lib/api/uploads";

import EditIcon from "@mui/icons-material/Edit";
import PublicIcon from "@mui/icons-material/Public";
import LockIcon from "@mui/icons-material/Lock";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const STAFF_ROLES: UserRole[] = ["admin", "moderator", "editor"];

function isStaff(role: unknown) {
    return STAFF_ROLES.includes(String(role).toLowerCase() as UserRole);
}

function formatDate(iso: string) {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function parseId(v: unknown): number | null {
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
}

export default function ModulePage() {
    const router = useRouter();
    const params = useParams<{ id?: string }>();
    const moduleId = useMemo(() => parseId(params?.id), [params?.id]);

    const {user, ready} = useAuth();
    const staff = useMemo(() => (user ? isStaff(user.role) : false), [user]);

    const [mod, setMod] = useState<Module | null>(null);
    const [sections, setSections] = useState<ModuleSectionPosts[]>([]);
    const [openSections, setOpenSections] = useState<Set<string>>(new Set());

    // ✅ фатальная ошибка загрузки модуля/постов
    const [loadPending, setLoadPending] = useState(false);
    const [loadErr, setLoadErr] = useState<string | null>(null);
    const [notFoundModule, setNotFoundModule] = useState(false);
    const [fatalError, setFatalError] = useState<Error | null>(null);

    // ✅ ошибки действия (delete/toggle) — НЕ фатальные, но можно тоже показывать сверху
    const [actionPending, setActionPending] = useState(false);
    const [actionErr, setActionErr] = useState<string | null>(null);

    // post_id -> completed
    const [progressMap, setProgressMap] = useState<Map<number, boolean>>(new Map());

    // cover
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [coverPending, setCoverPending] = useState(false);

    // ✅ прогресс (не фатально)
    useEffect(() => {
        if (!ready) return;

        if (!user) {
            setProgressMap(new Map());
            return;
        }

        let cancelled = false;

        async function loadProgress() {
            try {
                const reads = await listMyReads({
                    only_published: false,
                    only_completed: true,
                });

                if (cancelled) return;

                const m = new Map<number, boolean>();
                for (const r of reads) {
                    if (r.is_completed) m.set(r.post_id, true);
                }
                setProgressMap(m);
            } catch {
                if (!cancelled) setProgressMap(new Map());
            }
        }

        loadProgress();
        return () => {
            cancelled = true;
        };
    }, [ready, user?.id]);

    // ✅ load module + posts (фатально)
    useEffect(() => {
        if (!ready) return;

        const mid = moduleId;
        if (typeof mid !== "number") {
            setLoadErr("Invalid module id.");
            setMod(null);
            setSections([]);
            setOpenSections(new Set());
            return;
        }

        let cancelled = false;

        async function load() {
            setNotFoundModule(false);
            setLoadErr(null);
            setLoadPending(true);

            try {
                const [m, modulePosts] = await Promise.all([
                    getModule(mid),
                    getModulePosts(mid),
                ]);

                if (cancelled) return;

                if (!m) {
                    setMod(null);
                    setSections([]);
                    setOpenSections(new Set());
                    setLoadErr("Module not found (or not published).");
                    return;
                }

                setMod(m);
                setSections(modulePosts);
                setOpenSections(new Set(modulePosts.map((s, idx) => sectionKey(s, idx))));
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError) {
                    if (e.status === 404) {
                        setNotFoundModule(true);
                        return;
                    }
                    if (e.status === 401 || e.status === 403) {
                        setLoadErr("Нет доступа к модулю.");
                        setMod(null);
                        setSections([]);
                        setOpenSections(new Set());
                        return;
                    }
                    setFatalError(e);
                    return;
                }
                if (e instanceof TypeError) {
                    setLoadErr("Проблема сети. Попробуйте позже.");
                    setMod(null);
                    setSections([]);
                    setOpenSections(new Set());
                    return;
                }
                setFatalError(e instanceof Error ? e : new Error("Failed to load module."));
                setMod(null);
                setSections([]);
                setOpenSections(new Set());
            } finally {
                if (!cancelled) setLoadPending(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [moduleId, ready, staff]);

    const sectionKey = (s: ModuleSectionPosts, idx: number) => String(s.id ?? `unknown-${idx}`);

    const flatPosts = useMemo(
        () => sections.flatMap((s) => s.posts),
        [sections]
    );

    // ✅ load cover (не фатально)
    useEffect(() => {
        if (!ready) return;

        const mid = moduleId;
        if (typeof mid !== "number") {
            setCoverUrl(null);
            return;
        }

        let cancelled = false;

        async function loadCover() {
            setCoverPending(true);
            try {
                const list = await listModuleImages(mid);
                if (cancelled) return;

                const u = list?.[0]?.url ? String(list[0].url) : "";
                setCoverUrl(u ? toAbsoluteUrl(u) : null);
            } catch {
                if (!cancelled) setCoverUrl(null);
            } finally {
                if (!cancelled) setCoverPending(false);
            }
        }

        loadCover();
        return () => {
            cancelled = true;
        };
    }, [ready, moduleId]);

    async function onDelete() {
        if (!mod) return;
        if (!confirm(`Delete module "${mod.title}"? This action cannot be undone.`)) return;

        setActionPending(true);
        setActionErr(null);
        try {
            await deleteModule(mod.id);
            router.push("/learn");
            router.refresh();
        } catch (e) {
            if (e instanceof ApiError) setActionErr(e.message);
            else setActionErr("Delete failed.");
        } finally {
            setActionPending(false);
        }
    }

    async function onTogglePublic() {
        if (!mod) return;

        setActionPending(true);
        setActionErr(null);
        try {
            await setModulePublic(mod.id, !mod.is_published);
            setMod({...mod, is_published: !mod.is_published});
            router.refresh();
        } catch (e) {
            if (e instanceof ApiError) setActionErr(e.message);
            else setActionErr("Update failed.");
        } finally {
            setActionPending(false);
        }
    }

    if (fatalError) throw fatalError;
    if (notFoundModule) notFound();

    if (!ready) return null;

    // ✅ если загрузка модуля/постов упала — показываем ТОЛЬКО ошибку
    if (loadErr) {
        return (
            <main className="mx-auto w-full max-w-6xl px-6 py-10">
                <div
                    className={cn(
                        "surface p-4 text-sm text-fg",
                        "ring-1 ring-inset ring-ring/20",
                        "bg-[hsl(var(--ring)/0.06)]"
                    )}
                >
                    {loadErr}
                </div>
            </main>
        );
    }

    // можно показывать скелет во время первой загрузки (пока нет mod)
    if (loadPending && !mod) {
        return (
            <main className="mx-auto w-full max-w-6xl px-6 py-10">
                <div className={cn("surface p-6 text-sm text-muted-fg", "ring-1 ring-inset ring-border")}>
                    Loading…
                </div>
            </main>
        );
    }

    const canUseId = typeof moduleId === "number";
    const pending = loadPending || actionPending;

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-6">
                <div className="mb-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* left: cover + text */}
                    <div className="flex min-w-0 flex-1 gap-4">
                        {/* Cover */}
                        <div
                            className={cn(
                                "relative h-36 w-36 shrink-0 overflow-hidden rounded-xl",
                                "ring-1 ring-inset ring-border",
                                "bg-[hsl(var(--ring)/0.06)]"
                            )}
                            aria-label="Module cover"
                        >
                            {coverUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={coverUrl}
                                    alt=""
                                    className="h-full w-full object-cover object-center"
                                    loading="eager"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-muted-fg">
                                    {coverPending ? "Loading…" : "No cover"}
                                </div>
                            )}
                        </div>

                        {/* Title/desc/meta */}
                        <div className="min-w-0 flex-1">
                            <h1 className="truncate text-2xl font-semibold tracking-tight text-fg">
                                {mod?.title ?? "Module"}
                            </h1>

                            {mod?.description ? (
                                <p className="mt-2 whitespace-pre-wrap wrap-break-word text-sm text-muted-fg">
                                    {mod.description}
                                </p>
                            ) : null}

                            {mod ? (
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                                    <span
                                        className={cn(
                                            "rounded-md border px-2 py-0.5",
                                            "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.10)] text-fg"
                                        )}
                                    >
                                        {mod.is_published ? "public" : "draft"}
                                    </span>
                                    <span>author: {mod.author}</span>
                                    <span>updated: {formatDate(mod.updated_at)}</span>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                {staff ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
                        {canUseId ? (
                            <Link
                                href={`/learn/${moduleId}/edit`}
                                className={cn("btn", "disabled:opacity-60")}
                                aria-disabled={pending}
                            >
                                <EditIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                Edit module
                            </Link>
                        ) : (
                            <button type="button" className={cn("btn", "disabled:opacity-60")} disabled>
                                <EditIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                Edit module
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onTogglePublic}
                            disabled={pending || !mod}
                            className={cn("btn", "disabled:cursor-not-allowed disabled:opacity-60")}
                        >
                            {mod?.is_published ? (
                                <LockIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                            ) : (
                                <PublicIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                            )}
                            {mod?.is_published ? "Set draft" : "Set public"}
                        </button>

                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={pending || !mod}
                            className={cn(
                                "btn",
                                "hover:bg-[hsl(0_90%_55%/0.10)] hover:border-[hsl(0_90%_55%/0.45)]",
                                "disabled:cursor-not-allowed disabled:opacity-60"
                            )}
                        >
                            <DeleteOutlineIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                            Delete
                        </button>
                    </div>
                ) : null}

                {actionErr ? (
                    <div
                        className={cn(
                            "surface p-4 text-sm text-fg",
                            "ring-1 ring-inset ring-ring/20",
                            "bg-[hsl(var(--ring)/0.06)]"
                        )}
                    >
                        {actionErr}
                    </div>
                ) : null}
            </header>

            {/* posts list */}
            <section className="grid gap-4">
                {pending && flatPosts.length === 0 ? (
                    <div className={cn("surface p-6 text-sm text-muted-fg", "ring-1 ring-inset ring-border")}>
                        Loading…
                    </div>
                ) : flatPosts.length === 0 ? (
                    <div className={cn("surface p-6 text-sm text-muted-fg", "ring-1 ring-inset ring-border")}>
                        No posts in this module.
                    </div>
                ) : (
                    sections
                        .filter((s) => s.posts.length > 0)
                        .map((s, idx) => {
                            const key = sectionKey(s, idx);
                            const isOpen = openSections.has(key);
                            return (
                                <div
                                    key={key}
                                    className={cn("surface p-4", "ring-1 ring-inset ring-border")}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-medium text-fg">
                                            {s.is_unknown ? "Без секции" : s.title}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-fg">
                                            <span>{s.posts.length} posts</span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setOpenSections((prev) => {
                                                        const next = new Set(prev);
                                                        if (next.has(key)) next.delete(key);
                                                        else next.add(key);
                                                        return next;
                                                    })
                                                }
                                                className={cn("btn h-8 px-2 text-xs")}
                                                aria-expanded={isOpen}
                                            >
                                                {isOpen ? (
                                                    <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
                                                ) : (
                                                    <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    {isOpen ? (
                                        <div className="mt-3 grid gap-3">
                                            {s.posts.map((p) => (
                                                <PostCard
                                                    key={p.id}
                                                    post={p}
                                                    isCompleted={progressMap.get(p.id) === true}
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })
                )}
            </section>
        </main>
    );
}
