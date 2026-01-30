// src/app/me/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/apiClient";
import { listMyReads, type ProgressPost } from "@/lib/api/me";
import { listModules, getModulePosts, type Module, type Post as ModulePost } from "@/lib/api/modules";

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

/** Reusable: ring-hover link card (inset ring so it never clips) */
const ringHoverCard =
    "transition-[transform,background-color,border-color,box-shadow] duration-150 " +
    "hover:-translate-y-[1px] " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/30 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

function CompletedPostCard({ p }: { p: ProgressPost }) {
    return (
        <Link
            href={`/posts/${p.post_id}`}
            className={cn("surface p-5", ringHoverCard)}
            aria-label={`Open post: ${p.title}`}
        >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                <span className="rounded-md border border-border bg-card px-2 py-1">{p.category_tag}</span>
                <span>•</span>
                <span className="truncate">by {p.author}</span>
                <span>•</span>
                <span>updated {formatDate(p.updated_at)}</span>

                <span>•</span>
                <span className="rounded-md border border-border bg-card px-2 py-1">
          completed {p.completed_at ? formatDate(p.completed_at) : "—"}
        </span>
            </div>

            <h3 className="mt-3 text-lg font-semibold tracking-tight text-fg">{p.title}</h3>

            {p.preview_text ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-fg">{p.preview_text}</p>
            ) : (
                <p className="mt-2 text-sm text-muted-fg">No preview.</p>
            )}
        </Link>
    );
}

function CompletedModuleCard({ m }: { m: Module }) {
    return (
        <Link href={`/learn/${m.id}`} className={cn("surface p-5", ringHoverCard)} aria-label={`Open module: ${m.title}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-fg">
          <span
              className={cn(
                  "rounded-md border px-2 py-1",
                  "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.10)] text-fg"
              )}
          >
            module
          </span>
                    <span>•</span>
                    <span className="truncate">by {m.author}</span>
                    <span>•</span>
                    <span>updated {formatDate(m.updated_at)}</span>
                </div>

                <span
                    className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                        "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.08)] text-fg"
                    )}
                    title="Completed"
                >
          <TaskAltIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
          <span>done</span>
        </span>
            </div>

            <h3 className="mt-3 text-lg font-semibold tracking-tight text-fg">{m.title}</h3>

            {m.description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-fg">{m.description}</p>
            ) : (
                <p className="mt-2 text-sm text-muted-fg">No description.</p>
            )}
        </Link>
    );
}

type TabKey = "posts" | "modules";

export default function MePage() {
    const router = useRouter();
    const { user, ready } = useAuth();

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
                const reads = await listMyReads({
                    only_published: false,
                    only_completed: true,
                });
                if (cancelled) return;
                const completedSet = new Set<number>(reads.map((r) => r.post_id));

                const mods = await listModules({ only_published: false });
                if (cancelled) return;

                const done: Module[] = [];
                for (const m of mods) {
                    const posts: ModulePost[] = await getModulePosts(m.id, {only_published: false});
                    if (cancelled) return;

                    if (posts.length === 0) continue;
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

    const tabBase =
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium " +
        "transition-[background-color,border-color] duration-150 " + // ✅ no transform
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

    const tabActive = "border-primary bg-primary text-primary-fg";

    // ✅ hover without lift (no jump)
    const tabInactive =
        "border-border bg-card text-fg " +
        "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)]";

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            {/* Header — STATIC (no card-gloss) */}
            <section
                className={cn(
                    "rounded-xl border border-border bg-card p-6 shadow-sm",
                    "ring-1 ring-inset ring-border"
                )}
            >
                <div className="grid gap-6 lg:grid-cols-12">
                    {/* Left */}
                    <div className="lg:col-span-8">
                        <div className="flex items-start gap-4">
                            <div
                                className={cn(
                                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
                                    "border border-border bg-[hsl(var(--ring)/0.10)] text-fg",
                                    "text-lg font-semibold",
                                    "ring-1 ring-inset ring-ring/15"
                                )}
                                aria-label="User avatar"
                                title={user.login}
                            >
                                {avatarLetter}
                            </div>

                            <div className="min-w-0">
                                <div className="truncate text-xl font-semibold tracking-tight text-fg">{user.login}</div>
                                <div className="mt-1 text-sm text-muted-fg">
                                    Role: <span className="text-fg">{user.role}</span>
                                </div>
                            </div>
                        </div>

                        {/* Contacts */}
                        <div className={cn("mt-5 surface p-4", "ring-1 ring-inset ring-border")}>
                            <div className="text-sm font-medium text-fg">Contacts</div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div>
                                    <div className="text-xs text-muted-fg">Email</div>
                                    <div className="mt-1 text-sm text-fg">user@example.com</div>
                                </div>

                                <div>
                                    <div className="text-xs text-muted-fg">Website</div>
                                    <div className="mt-1 flex items-center gap-2 text-sm text-fg">
                                        <LinkIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                        https://example.com
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-muted-fg">GitHub</div>
                                    <div className="mt-1 flex items-center gap-2 text-sm text-fg">
                                        <LinkIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                        https://github.com/username
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-muted-fg">Telegram</div>
                                    <div className="mt-1 flex items-center gap-2 text-sm text-fg">
                                        <LinkIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                        https://t.me/username
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 text-xs text-muted-fg">Пока это затычки. Позже сделаем сохранение в таблицу профиля.</div>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="lg:col-span-4">
                        <div className={cn("surface p-4", "ring-1 ring-inset ring-border")}>
                            <div className="text-sm font-medium text-fg">User rating</div>
                            <div className="mt-2 text-3xl font-semibold text-fg">—</div>
                            <div className="mt-1 text-xs text-muted-fg">Placeholder (позже свяжем со статистикой/прогрессом).</div>
                        </div>

                        <div className={cn("mt-4 surface p-4", "ring-1 ring-inset ring-border")}>
                            <div className="text-sm font-medium text-fg">Quick links</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Link href="/me/saved" className="btn">
                                    Saved posts
                                </Link>
                                <Link href="/learn" className="btn">
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
                        className={cn(tabBase, tab === "posts" ? tabActive : tabInactive)}
                    >
                        <TaskAltIcon sx={{ fontSize: 18 }} className={cn(tab === "posts" ? "text-primary-fg" : "text-muted-fg")} />
                        Completed posts
                        <span
                            className={cn(
                                "ml-1 rounded-md px-2 py-0.5 text-xs",
                                tab === "posts"
                                    ? "bg-primary-fg/15 text-primary-fg"
                                    : "border border-border bg-[hsl(var(--ring)/0.08)] text-muted-fg"
                            )}
                        >
              {postsCountLabel}
            </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTab("modules")}
                        className={cn(tabBase, tab === "modules" ? tabActive : tabInactive)}
                    >
                        <MenuBookIcon sx={{ fontSize: 18 }} className={cn(tab === "modules" ? "text-primary-fg" : "text-muted-fg")} />
                        Completed modules
                        <span
                            className={cn(
                                "ml-1 rounded-md px-2 py-0.5 text-xs",
                                tab === "modules"
                                    ? "bg-primary-fg/15 text-primary-fg"
                                    : "border border-border bg-[hsl(var(--ring)/0.08)] text-muted-fg"
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
                        <div className={cn("surface p-4 text-sm text-fg", "ring-1 ring-inset ring-ring/15", "bg-[hsl(var(--ring)/0.06)]")}>
                            {postsErr}
                        </div>
                    ) : postsLoading ? (
                        <div className={cn("surface p-6", "ring-1 ring-inset ring-border")}>
                            <div className="text-sm text-muted-fg">Loading…</div>
                        </div>
                    ) : completedPosts.length === 0 ? (
                        <div className={cn("surface p-6", "ring-1 ring-inset ring-border")}>
                            <div className="text-sm text-muted-fg">No completed posts yet.</div>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {completedPosts.map((p) => (
                                <CompletedPostCard key={p.post_id} p={p} />
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <section className="mt-4">
                    {modulesErr ? (
                        <div className={cn("surface p-4 text-sm text-fg", "ring-1 ring-inset ring-ring/15", "bg-[hsl(var(--ring)/0.06)]")}>
                            {modulesErr}
                        </div>
                    ) : modulesLoading ? (
                        <div className={cn("surface p-6", "ring-1 ring-inset ring-border")}>
                            <div className="text-sm text-muted-fg">Loading…</div>
                        </div>
                    ) : completedModules.length === 0 ? (
                        <div className={cn("surface p-6", "ring-1 ring-inset ring-border")}>
                            <div className="text-sm text-muted-fg">No completed modules yet.</div>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {completedModules.map((m) => (
                                <CompletedModuleCard key={m.id} m={m} />
                            ))}
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}
