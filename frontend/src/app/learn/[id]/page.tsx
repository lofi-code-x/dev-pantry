// src/app/learn/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/apiClient";
import {
    deleteModule,
    getModulePosts,
    listModules,
    setModulePublic,
    type Module,
    type Post,
} from "@/lib/api/modules";
import type { UserRole } from "@/lib/types";
import { PostCard } from "@/components/posts/PostCard";
import { listMyReads } from "@/lib/api/me";

// ✅ Icons (MUI)
import EditIcon from "@mui/icons-material/Edit";
import PublicIcon from "@mui/icons-material/Public";
import LockIcon from "@mui/icons-material/Lock";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

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

export default function ModulePage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const moduleId = Number(params.id);

    const { user, ready } = useAuth();
    const staff = useMemo(() => (user ? isStaff(user.role) : false), [user]);

    const [mod, setMod] = useState<Module | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);

    const [pending, setPending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // post_id -> completed
    const [progressMap, setProgressMap] = useState<Map<number, boolean>>(new Map());

    // ✅ прогресс: один раз при логине/готовности
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

    useEffect(() => {
        if (!Number.isFinite(moduleId) || moduleId <= 0) {
            setErr("Invalid module id.");
            return;
        }

        if (!ready) return;

        let cancelled = false;

        async function load() {
            setErr(null);
            setPending(true);

            try {
                const onlyPublished = !staff;

                const [mods, modulePosts] = await Promise.all([
                    listModules({ only_published: onlyPublished }),
                    getModulePosts(moduleId, { only_published: onlyPublished }),
                ]);

                if (cancelled) return;

                const found = mods.find((m) => m.id === moduleId) ?? null;
                setMod(found);
                setPosts(modulePosts);

                if (!found) {
                    setErr("Module not found (or not published).");
                }
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError) setErr(e.message);
                else setErr("Failed to load module.");
            } finally {
                if (!cancelled) setPending(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [moduleId, ready, staff]);

    async function onDelete() {
        if (!mod) return;
        if (!confirm(`Delete module "${mod.title}"? This action cannot be undone.`)) return;

        setPending(true);
        setErr(null);
        try {
            await deleteModule(mod.id);
            router.push("/learn");
            router.refresh();
        } catch (e) {
            if (e instanceof ApiError) setErr(e.message);
            else setErr("Delete failed.");
        } finally {
            setPending(false);
        }
    }

    async function onTogglePublic() {
        if (!mod) return;

        setPending(true);
        setErr(null);
        try {
            await setModulePublic(mod.id, !mod.is_published);
            setMod({ ...mod, is_published: !mod.is_published });
            router.refresh();
        } catch (e) {
            if (e instanceof ApiError) setErr(e.message);
            else setErr("Update failed.");
        } finally {
            setPending(false);
        }
    }

    if (!ready) return null;

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-6">
                <div className="mb-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* left */}
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

                    {/* right: staff actions */}
                    {staff ? (
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <Link
                                href={`/learn/${moduleId}/edit`}
                                className={cn("btn", "disabled:opacity-60")}
                                aria-disabled={pending}
                            >
                                <EditIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                Edit module
                            </Link>

                            <button
                                type="button"
                                onClick={onTogglePublic}
                                disabled={pending || !mod}
                                className={cn("btn", "disabled:cursor-not-allowed disabled:opacity-60")}
                            >
                                {mod?.is_published ? (
                                    <LockIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                ) : (
                                    <PublicIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                )}
                                {mod?.is_published ? "Set draft" : "Set public"}
                            </button>

                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={pending || !mod}
                                className={cn(
                                    "btn",
                                    // delete: чуть краснее на hover, но не ломаем токены
                                    "hover:bg-[hsl(0_90%_55%/0.10)] hover:border-[hsl(0_90%_55%/0.45)]",
                                    "disabled:cursor-not-allowed disabled:opacity-60"
                                )}
                            >
                                <DeleteOutlineIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                Delete
                            </button>
                        </div>
                    ) : null}
                </div>

                {err ? (
                    <div
                        className={cn(
                            "surface p-4 text-sm text-fg",
                            "ring-1 ring-inset ring-ring/20",
                            "bg-[hsl(var(--ring)/0.06)]"
                        )}
                    >
                        {err}
                    </div>
                ) : null}
            </header>

            {/* posts list */}
            <section className="grid gap-3">
                {pending && posts.length === 0 ? (
                    <div className={cn("surface p-6 text-sm text-muted-fg", "ring-1 ring-inset ring-border")}>
                        Loading…
                    </div>
                ) : posts.length === 0 ? (
                    <div className={cn("surface p-6 text-sm text-muted-fg", "ring-1 ring-inset ring-border")}>
                        No posts in this module.
                    </div>
                ) : (
                    posts.map((p) => (
                        <PostCard key={p.id} post={p} isCompleted={progressMap.get(p.id) === true} />
                    ))
                )}
            </section>
        </main>
    );
}
