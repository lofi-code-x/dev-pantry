// src/app/me/page.tsx
"use client";

import React, {useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useAuth} from "@/components/auth/AuthProvider";
import {ApiError, toAbsoluteUrl} from "@/lib/apiClient";
import {
    getMyContacts,
    getMyStats,
    listMyReads,
    updateMyContacts,
    type ProgressPost,
    type UserContacts,
    type UserStats,
} from "@/lib/api/me";
import {listModules, getModulePosts, type Module, type ModuleSectionPosts} from "@/lib/api/modules";
import {deleteAvatar, uploadAvatar} from "@/lib/api/uploads";

import LinkIcon from "@mui/icons-material/Link";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import EditIcon from "@mui/icons-material/Edit";
import UploadIcon from "@mui/icons-material/Upload";

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

function CompletedPostCard({p}: { p: ProgressPost }) {
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

function CompletedModuleCard({m}: { m: Module }) {
    return (
        <Link href={`/learn/${m.id}`} className={cn("surface p-5", ringHoverCard)}
              aria-label={`Open module: ${m.title}`}>
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
          <TaskAltIcon sx={{fontSize: 18}} className="text-muted-fg"/>
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
    const {user, ready} = useAuth();

    const [tab, setTab] = useState<TabKey>("posts");

    const [completedPosts, setCompletedPosts] = useState<ProgressPost[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postsErr, setPostsErr] = useState<string | null>(null);

    const [completedModules, setCompletedModules] = useState<Module[]>([]);
    const [modulesLoading, setModulesLoading] = useState(false);
    const [modulesErr, setModulesErr] = useState<string | null>(null);

    const [stats, setStats] = useState<UserStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsErr, setStatsErr] = useState<string | null>(null);

    const [contacts, setContacts] = useState<UserContacts | null>(null);
    const [contactsLoading, setContactsLoading] = useState(false);
    const [contactsErr, setContactsErr] = useState<string | null>(null);
    const [contactsSaving, setContactsSaving] = useState(false);
    const [contactsSaved, setContactsSaved] = useState(false);
    const [contactsEditing, setContactsEditing] = useState(false);

    const [email, setEmail] = useState("");
    const [website, setWebsite] = useState("");
    const [github, setGithub] = useState("");
    const [telegram, setTelegram] = useState("");

    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarErr, setAvatarErr] = useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarDeleting, setAvatarDeleting] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement | null>(null);
    const [fatalError, setFatalError] = useState<Error | null>(null);

    useEffect(() => {
        if (!ready) return;
        if (!user) router.replace("/login");
    }, [ready, user, router]);

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
                if (e instanceof ApiError) {
                    if (e.status >= 500) {
                        setFatalError(e);
                        return;
                    }
                    setPostsErr(e.message);
                    return;
                }
                if (e instanceof TypeError) {
                    setPostsErr("Проблема сети. Попробуйте позже.");
                    return;
                }
                setFatalError(e instanceof Error ? e : new Error("Failed to load completed posts."));
            } finally {
                if (!cancelled) setPostsLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [ready, user]);

    // load stats
    useEffect(() => {
        if (!ready) return;
        if (!user) return;

        let cancelled = false;

        async function load() {
            setStatsErr(null);
            setStatsLoading(true);
            try {
                const res = await getMyStats();
                if (!cancelled) setStats(res);
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError) {
                    if (e.status >= 500) {
                        setFatalError(e);
                        return;
                    }
                    setStatsErr(e.message);
                    return;
                }
                if (e instanceof TypeError) {
                    setStatsErr("Проблема сети. Попробуйте позже.");
                    return;
                }
                setFatalError(e instanceof Error ? e : new Error("Failed to load stats."));
            } finally {
                if (!cancelled) setStatsLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [ready, user]);

    useEffect(() => {
        if (!ready) return;
        if (!user) return;

        let cancelled = false;

        async function load() {
            setContactsErr(null);
            setContactsLoading(true);
            try {
                const res = await getMyContacts();
                if (cancelled) return;
                setContacts(res);
                setEmail(res.email ?? "");
                setWebsite(res.website ?? "");
                setGithub(res.github ?? "");
                setTelegram(res.telegram ?? "");
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError) {
                    if (e.status >= 500) {
                        setFatalError(e);
                        return;
                    }
                    setContactsErr(e.message);
                    return;
                }
                if (e instanceof TypeError) {
                    setContactsErr("Проблема сети. Попробуйте позже.");
                    return;
                }
                setFatalError(e instanceof Error ? e : new Error("Failed to load contacts."));
            } finally {
                if (!cancelled) setContactsLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [ready, user]);

    async function onSaveContacts(e: React.FormEvent) {
        e.preventDefault();
        setContactsErr(null);
        setContactsSaved(false);
        setContactsSaving(true);
        try {
            const res = await updateMyContacts({
                email,
                website,
                github,
                telegram,
            });
            setContacts(res);
            setContactsSaved(true);
            setContactsEditing(false);
        } catch (e) {
            if (e instanceof ApiError) {
                if (e.status >= 500) {
                    setFatalError(e);
                    return;
                }
                setContactsErr(e.message);
            } else if (e instanceof TypeError) {
                setContactsErr("Проблема сети. Попробуйте позже.");
            } else {
                setFatalError(e instanceof Error ? e : new Error("Failed to save contacts."));
            }
        } finally {
            setContactsSaving(false);
        }
    }

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

                const mods = await listModules();
                if (cancelled) return;

                const done: Module[] = [];
                for (const m of mods) {
                    const sections: ModuleSectionPosts[] = await getModulePosts(m.id);
                    if (cancelled) return;

                    const posts = sections.flatMap((s) => s.posts);
                    if (posts.length === 0) continue;
                    const allDone = posts.every((p) => completedSet.has(p.id));
                    if (allDone) done.push(m);
                }

                if (!cancelled) setCompletedModules(done);
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError) {
                    if (e.status >= 500) {
                        setFatalError(e);
                        return;
                    }
                    setModulesErr(e.message);
                    setCompletedModules([]);
                    return;
                }
                if (e instanceof TypeError) {
                    setModulesErr("Проблема сети. Попробуйте позже.");
                    setCompletedModules([]);
                    return;
                }
                setFatalError(e instanceof Error ? e : new Error("Failed to load completed modules."));
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

    useEffect(() => {
        if (!ready || !user) return;
        if (typeof window === "undefined") return;

        const key = `devpantry_avatar_url_${user.id}`;
        const stored = localStorage.getItem(key);
        setAvatarUrl(stored || null);
    }, [ready, user]);

    const avatarBusy = avatarUploading || avatarDeleting;

        if (!ready) return null;
        if (!user) return null;
        if (fatalError) throw fatalError;

    const postsCountLabel = postsLoading ? "Loading…" : `${completedPosts.length} items`;
    const modulesCountLabel = modulesLoading ? "Loading…" : `${completedModules.length} items`;

    const tabBase =
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium " +
        "transition-[background-color,border-color] duration-150 " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

    const tabActive = "border-primary bg-primary text-primary-fg";


    const tabInactive =
        "border-border bg-card text-fg " +
        "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)]";

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <section
                className={cn(
                    "rounded-xl border border-border bg-card p-6 shadow-sm",
                    "ring-1 ring-inset ring-border"
                )}
            >
                <div className="grid gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                        <div className="flex items-start gap-4">
                            <div className="flex flex-col items-start gap-2">
                                <button
                                    type="button"
                                    disabled={avatarBusy}
                                    onClick={() => avatarInputRef.current?.click()}
                                    className={cn(
                                        "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full",
                                        "border border-border bg-[hsl(var(--ring)/0.10)] text-fg", ringHoverCard
                                    )}
                                    aria-label={avatarUrl ? "Replace avatar" : "Upload avatar"}
                                    title={avatarUploading ? "Uploading…" : avatarUrl ? "Replace avatar" : "Upload avatar"}
                                >
                                    {avatarUrl ? (
                                        <img
                                            src={toAbsoluteUrl(avatarUrl)}
                                            alt={`${user.login} avatar`}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <UploadIcon sx={{fontSize: 22}} className="text-muted-fg"/>
                                    )}
                                </button>

                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setAvatarErr(null);
                                        setAvatarUploading(true);
                                        try {
                                            if (avatarUrl) {
                                                await deleteAvatar();
                                            }
                                            const res = await uploadAvatar(file);
                                            setAvatarUrl(res.url);
                                            if (typeof window !== "undefined") {
                                                const key = `devpantry_avatar_url_${user.id}`;
                                                localStorage.setItem(key, res.url);
                                            }
                                        } catch (err) {
                                            setAvatarErr(err instanceof ApiError ? err.message : "Failed to upload avatar.");
                                        } finally {
                                            setAvatarUploading(false);
                                            if (avatarInputRef.current) {
                                                avatarInputRef.current.value = "";
                                            }
                                        }
                                    }}
                                />

                                {avatarUrl ? null : null}
                            </div>

                            <div className="min-w-6">
                                <div
                                    className="truncate text-xl font-semibold tracking-tight text-fg">{user.login}</div>
                                <div className="mt-1 text-sm text-muted-fg">
                                    Role: <span className="text-fg">{user.role}</span>
                                </div>
                                {avatarErr ? (
                                    <div className="mt-2 text-xs text-muted-fg">{avatarErr}</div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-12 lg:items-stretch">
                    <div className="lg:col-span-8">
                        <div className={cn("surface p-4", "ring-1 ring-inset ring-border")}>
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-medium text-fg">Contacts</div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!contactsEditing) {
                                            setContactsSaved(false);
                                        }
                                        setContactsEditing((prev) => !prev);
                                    }}
                                    className={cn(
                                        "inline-flex items-center justify-center rounded-md border px-2 py-1",
                                        "border-border bg-card text-fg hover:bg-[hsl(var(--ring)/0.10)]"
                                    )}
                                    title={contactsEditing ? "Exit edit mode" : "Edit contacts"}
                                    aria-label={contactsEditing ? "Exit edit mode" : "Edit contacts"}
                                >
                                    <EditIcon sx={{fontSize: 16}} className="text-muted-fg"/>
                                </button>
                            </div>
                            {contactsLoading ? (
                                <div className="mt-3 text-sm text-muted-fg">Loading contacts…</div>
                            ) : contactsEditing ? (
                                <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={onSaveContacts}>
                                    <label className="block">
                                        <div className="text-xs text-muted-fg">Email</div>
                                        <input
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input mt-1"
                                            placeholder="you@example.com"
                                            disabled={contactsSaving}
                                        />
                                    </label>

                                    <label className="block">
                                        <div className="text-xs text-muted-fg">Website</div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <LinkIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                            <input
                                                value={website}
                                                onChange={(e) => setWebsite(e.target.value)}
                                                className="input flex-1"
                                                placeholder="https://example.com"
                                                disabled={contactsSaving}
                                            />
                                        </div>
                                    </label>

                                    <label className="block">
                                        <div className="text-xs text-muted-fg">GitHub</div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <LinkIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                            <input
                                                value={github}
                                                onChange={(e) => setGithub(e.target.value)}
                                                className="input flex-1"
                                                placeholder="https://github.com/username"
                                                disabled={contactsSaving}
                                            />
                                        </div>
                                    </label>

                                    <label className="block">
                                        <div className="text-xs text-muted-fg">Telegram</div>
                                        <div className="mt-1 flex items-center gap-2">
                                            <LinkIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                            <input
                                                value={telegram}
                                                onChange={(e) => setTelegram(e.target.value)}
                                                className="input flex-1"
                                                placeholder="https://t.me/username"
                                                disabled={contactsSaving}
                                            />
                                        </div>
                                    </label>

                                    <div className="sm:col-span-2 flex items-center justify-between gap-3">
                                        <div className="text-xs text-muted-fg">
                                            {contactsErr
                                                ? contactsErr
                                                : contactsSaved
                                                    ? "Saved."
                                                    : contacts
                                                        ? " "
                                                        : "No contacts yet."}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={contactsSaving}
                                                onClick={() => {
                                                    setContactsEditing(false);
                                                    setContactsErr(null);
                                                    setContactsSaved(false);
                                                    setEmail(contacts?.email ?? "");
                                                    setWebsite(contacts?.website ?? "");
                                                    setGithub(contacts?.github ?? "");
                                                    setTelegram(contacts?.telegram ?? "");
                                                }}
                                                className={cn("btn px-3 py-2", "disabled:cursor-not-allowed disabled:opacity-60")}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={contactsSaving}
                                                className={cn(
                                                    "btn px-4 py-2",
                                                    "disabled:cursor-not-allowed disabled:opacity-60"
                                                )}
                                            >
                                                {contactsSaving ? "Saving…" : "Save contacts"}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            ) : (
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <div className="text-xs text-muted-fg">Email</div>
                                        <div className="mt-1 text-sm text-fg">{contacts?.email ?? "—"}</div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-muted-fg">Website</div>
                                        <div className="mt-1 flex items-center gap-2 text-sm text-fg">
                                            <LinkIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                            {contacts?.website ?? "—"}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-muted-fg">GitHub</div>
                                        <div className="mt-1 flex items-center gap-2 text-sm text-fg">
                                            <LinkIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                            {contacts?.github ?? "—"}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-muted-fg">Telegram</div>
                                        <div className="mt-1 flex items-center gap-2 text-sm text-fg">
                                            <LinkIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                            {contacts?.telegram ?? "—"}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-4">
                        <div
                            className={cn(
                                "surface p-4",
                                "ring-1 ring-inset ring-border",
                                "h-full",
                                "flex flex-col items-center justify-center text-center"
                            )}
                        >
                            <div className="text-sm font-medium text-fg">User rating</div>
                            <div className="mt-2 text-3xl font-semibold text-fg">
                                {statsLoading ? "…" : stats ? stats.total_xp : "—"}
                            </div>
                            <div className="mt-1 text-xs text-muted-fg">
                                {statsErr
                                    ? statsErr
                                    : stats
                                        ? `${stats.posts_completed} posts • ${stats.modules_completed} modules`
                                        : "No stats yet."}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-6">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setTab("posts")}
                        className={cn(tabBase, tab === "posts" ? tabActive : tabInactive)}
                    >
                        <TaskAltIcon sx={{fontSize: 18}}
                                     className={cn(tab === "posts" ? "text-primary-fg" : "text-muted-fg")}/>
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
                        <MenuBookIcon sx={{fontSize: 18}}
                                      className={cn(tab === "modules" ? "text-primary-fg" : "text-muted-fg")}/>
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

            {tab === "posts" ? (
                <section className="mt-4">
                    {postsErr ? (
                        <div
                            className={cn("surface p-4 text-sm text-fg", "ring-1 ring-inset ring-ring/15", "bg-[hsl(var(--ring)/0.06)]")}>
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
                                <CompletedPostCard key={p.post_id} p={p}/>
                            ))}
                        </div>
                    )}
                </section>
            ) : (
                <section className="mt-4">
                    {modulesErr ? (
                        <div
                            className={cn("surface p-4 text-sm text-fg", "ring-1 ring-inset ring-ring/15", "bg-[hsl(var(--ring)/0.06)]")}>
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
                                <CompletedModuleCard key={m.id} m={m}/>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </main>
    );
}
