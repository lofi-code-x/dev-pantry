// src/app/me/page.tsx
"use client";

import React, {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useAuth} from "@/components/auth/AuthProvider";
import {ApiError} from "@/lib/apiClient";
import {listMyReads, type ProgressPost} from "@/lib/api/me";
import {listModules, getModulePosts, type Module, type Post as ModulePost} from "@/lib/api/modules";

import LinkIcon from "@mui/icons-material/Link";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import MenuBookIcon from "@mui/icons-material/MenuBook";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function initialLetter(login: string) {
    return (login.trim()[0] ?? "?").toUpperCase();
}

function formatDate(iso: string) {
    try {
        return new Date(iso).toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    } catch {
        return iso;
    }
}

function CompletedPostCard({p}: { p: ProgressPost }) {
    return (
        <Link
            href={`/posts/${p.post_id}`}
            className={cn(
                "block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm",
                "hover:bg-neutral-50/50",
                "focus:outline-none focus:ring-2 focus:ring-neutral-200"
            )}
            aria-label={`Open post: ${p.title}`}
        >
            <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
        <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">
          {p.category_tag}
        </span>
                <span>•</span>
                <span className="truncate">by {p.author}</span>
                <span>•</span>
                <span>updated {formatDate(p.updated_at)}</span>

                <span>•</span>
                <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">
          completed {p.completed_at ? formatDate(p.completed_at) : "—"}
        </span>
            </div>

            <h3 className="mt-3 text-lg font-semibold tracking-tight text-neutral-950">{p.title}</h3>

            {p.preview_text ? (
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">{p.preview_text}</p>
            ) : (
                <p className="mt-2 text-sm text-neutral-600">No preview.</p>
            )}
        </Link>
    );
}

function CompletedModuleCard({m,}: { m: Module; }) {
    return (
        <Link
            href={`/learn/${m.id}`}
            className={cn(
                "block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm",
                "hover:bg-neutral-50/50",
                "focus:outline-none focus:ring-2 focus:ring-neutral-200"
            )}
            aria-label={`Open module: ${m.title}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-neutral-600">
          <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1">
            module
          </span>
                    <span>•</span>
                    <span className="truncate">by {m.author}</span>
                    <span>•</span>
                    <span>updated {formatDate(m.updated_at)}</span>
                </div>

                <span
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700"
                    title="Completed"
                >
          <TaskAltIcon sx={{fontSize: 18}} className="text-neutral-900"/>
          <span>
            done
          </span>
        </span>
            </div>

            <h3 className="mt-3 text-lg font-semibold tracking-tight text-neutral-950">{m.title}</h3>

            {m.description ? (
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">{m.description}</p>
            ) : (
                <p className="mt-2 text-sm text-neutral-600">No description.</p>
            )}
        </Link>
    );
}

type TabKey = "posts" | "modules";

export default function MePage() {
    const router = useRouter();
    const {user, ready} = useAuth();

    const [tab, setTab] = useState<TabKey>("posts");

    const [completedPosts, setCompletedPosts] = useState<ProgressPost[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsErr, setPostsErr] = useState<string | null>(null);

    const [completedModules, setCompletedModules] = useState<Module[]>([]);
    const [modulesLoading, setModulesLoading] = useState(false);
    const [modulesErr, setModulesErr] = useState<string | null>(null);

    // guard
    useEffect(() => {
        if (!ready) return;
        if (!user) router.replace("/login");
    }, [ready, user, router]);

    // load completed posts
    useEffect(() => {
        if (!ready) return;
        if (!user) return;

        let cancelled = false;

        async function load() {
            setPostsErr(null);
            setPostsLoading(true);
            try {
                const rows = await listMyReads({
                    only_published: false,
                    only_completed: true,
                });
                if (!cancelled) setCompletedPosts(rows);
            } catch (e) {
                if (cancelled) return;
                setPostsErr(e instanceof ApiError ? e.message : "Failed to load completed posts.");
            } finally {
                if (!cancelled) setPostsLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [ready, user]);

    // load completed modules (best-effort; N+1 but OK for now)
    useEffect(() => {
        if (!ready) return;
        if (!user) return;

        let cancelled = false;

        async function load() {
            setModulesErr(null);
            setModulesLoading(true);
            try {
                // 1) прогресс (completed posts) -> set of completed post_ids
                const reads = await listMyReads({
                    only_published: false,
                    only_completed: true,
                });
                if (cancelled) return;
                const completedSet = new Set<number>(reads.map((r) => r.post_id));

                // 2) список модулей (берём все; completed можно считать даже для draft)
                const mods = await listModules({only_published: false});
                if (cancelled) return;

                // 3) для каждого модуля получаем его посты и проверяем: все ли в completedSet
                const done: Module[] = [];
                for (const m of mods) {
                    const posts: ModulePost[] = await getModulePosts(m.id, {only_published: false});
                    if (cancelled) return;

                    if (posts.length === 0) continue; // пустые не считаем "пройденными"
                    const allDone = posts.every((p) => completedSet.has(p.id));
                    if (allDone) done.push(m);
                }

                if (!cancelled) setCompletedModules(done);
            } catch (e) {
                if (cancelled) return;
                setModulesErr(e instanceof ApiError ? e.message : "Failed to load completed modules.");
                setCompletedModules([]);
            } finally {
                if (!cancelled) setModulesLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [ready, user]);

    const avatarLetter = useMemo(() => (user ? initialLetter(user.login) : "?"), [user]);

    if (!ready) return null;
    if (!user) return null;

    const postsCountLabel = postsLoading ? "Loading…" : `${completedPosts.length} items`;
    const modulesCountLabel = modulesLoading ? "Loading…" : `${completedModules.length} items`;

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            {/* Header */}
            <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="grid gap-6 lg:grid-cols-12">
                    {/* Left: avatar + name + contacts */}
                    <div className="lg:col-span-8">
                        <div className="flex items-start gap-4">
                            <div
                                className={cn(
                                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
                                    "border border-neutral-200 bg-neutral-50 text-neutral-950",
                                    "text-lg font-semibold"
                                )}
                                aria-label="User avatar"
                                title={user.login}
                            >
                                {avatarLetter}
                            </div>

                            <div className="min-w-0">
                                <div className="truncate text-xl font-semibold tracking-tight text-neutral-950">
                                    {user.login}
                                </div>
                                <div className="mt-1 text-sm text-neutral-600">
                                    Role: <span className="text-neutral-800">{user.role}</span>
                                </div>
                            </div>
                        </div>

                        {/* Contacts (placeholders) */}
                        <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                            <div className="text-sm font-medium text-neutral-950">Contacts</div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div>
                                    <div className="text-xs text-neutral-600">Email</div>
                                    <div className="mt-1 text-sm text-neutral-800">user@example.com</div>
                                </div>

                                <div>
                                    <div className="text-xs text-neutral-600">Website</div>
                                    <div className="mt-1 flex items-center gap-2 text-sm text-neutral-800">
                                        <LinkIcon sx={{fontSize: 18}} className="text-neutral-600"/>
                                        https://example.com
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-neutral-600">GitHub</div>
                                    <div className="mt-1 flex items-center gap-2 text-sm text-neutral-800">
                                        <LinkIcon sx={{fontSize: 18}} className="text-neutral-600"/>
                                        https://github.com/username
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-neutral-600">Telegram</div>
                                    <div className="mt-1 flex items-center gap-2 text-sm text-neutral-800">
                                        <LinkIcon sx={{fontSize: 18}} className="text-neutral-600"/>
                                        https://t.me/username
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 text-xs text-neutral-600">
                                Пока это затычки. Позже сделаем сохранение в таблицу профиля.
                            </div>
                        </div>
                    </div>

                    {/* Right: rating placeholder */}
                    <div className="lg:col-span-4">
                        <div className="rounded-xl border border-neutral-200 bg-white p-4">
                            <div className="text-sm font-medium text-neutral-950">User rating</div>
                            <div className="mt-2 text-3xl font-semibold text-neutral-950">—</div>
                            <div className="mt-1 text-xs text-neutral-600">
                                Placeholder (позже свяжем со статистикой/прогрессом).
                            </div>
                        </div>

                        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
                            <div className="text-sm font-medium text-neutral-950">Quick links</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Link
                                    href="/me/saved"
                                    className={cn(
                                        "inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                                        "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                                    )}
                                >
                                    Saved posts
                                </Link>
                                <Link
                                    href="/learn"
                                    className={cn(
                                        "inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                                        "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                                    )}
                                >
                                    Learn
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tabs */}
            <section className="mt-6">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setTab("posts")}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                            tab === "posts"
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-200 bg-white text-neutral-950 hover:bg-neutral-50"
                        )}
                    >
                        <TaskAltIcon sx={{fontSize: 18}}
                                     className={cn(tab === "posts" ? "text-white" : "text-neutral-700")}/>
                        Completed posts
                        <span
                            className={cn(
                                "ml-1 rounded-md px-2 py-0.5 text-xs",
                                tab === "posts" ? "bg-white/15 text-white" : "bg-neutral-100 text-neutral-700"
                            )}
                        >
              {postsCountLabel}
            </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTab("modules")}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                            tab === "modules"
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-200 bg-white text-neutral-950 hover:bg-neutral-50"
                        )}
                    >
                        <MenuBookIcon sx={{fontSize: 18}}
                                      className={cn(tab === "modules" ? "text-white" : "text-neutral-700")}/>
                        Completed modules
                        <span
                            className={cn(
                                "ml-1 rounded-md px-2 py-0.5 text-xs",
                                tab === "modules" ? "bg-white/15 text-white" : "bg-neutral-100 text-neutral-700"
                            )}
                        >
              {modulesCountLabel}
            </span>
                    </button>
                </div>
            </section>

            {/* Tab content */}
            {tab === "posts" ? (
                <section className="mt-4">
                    {postsErr ? (
                        <div
                            className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-800">
                            {postsErr}
                        </div>
                    ) : postsLoading ? (
                        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                            <div className="text-sm text-neutral-700">Loading…</div>
                        </div>
                    ) : completedPosts.length === 0 ? (
                        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                            <div className="text-sm text-neutral-700">No completed posts yet.</div>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {completedPosts.map((p) => (
                                <CompletedPostCard key={p.post_id} p={p}/>
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <section className="mt-4">
                    {modulesErr ? (
                        <div
                            className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-800">
                            {modulesErr}
                        </div>
                    ) : modulesLoading ? (
                        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                            <div className="text-sm text-neutral-700">Loading…</div>
                        </div>
                    ) : completedModules.length === 0 ? (
                        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                            <div className="text-sm text-neutral-700">No completed modules yet.</div>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {completedModules.map((m) => (
                                <CompletedModuleCard key={m.id} m={m}/>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}
