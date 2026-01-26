"use client";

import React, {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useAuth} from "@/components/auth/AuthProvider";
import {ApiError} from "@/lib/apiClient";
import {listMyReads, type ProgressPost} from "@/lib/api/me";

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

function IconLink(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path
                d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 1 1 7 7l-1 1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 1 1-7-7l1-1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
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

            <h3 className="mt-3 text-lg font-semibold tracking-tight text-neutral-950">
                {p.title}
            </h3>

            {p.preview_text ? (
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                    {p.preview_text}
                </p>
            ) : (
                <p className="mt-2 text-sm text-neutral-600">No preview.</p>
            )}
        </Link>
    );
}

export default function MePage() {
    const router = useRouter();
    const {user, ready} = useAuth();

    const [completedPosts, setCompletedPosts] = useState<ProgressPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

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
            setErr(null);
            setLoading(true);
            try {
                const rows = await listMyReads({
                    only_published: false,
                    only_completed: true,
                });
                if (!cancelled) setCompletedPosts(rows);
            } catch (e) {
                if (cancelled) return;
                setErr(e instanceof ApiError ? e.message : "Failed to load completed posts.");
            } finally {
                if (!cancelled) setLoading(false);
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
                                        <IconLink className="h-4 w-4 text-neutral-600"/>
                                        https://example.com
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-neutral-600">GitHub</div>
                                    <div className="mt-1 flex items-center gap-2 text-sm text-neutral-800">
                                        <IconLink className="h-4 w-4 text-neutral-600"/>
                                        https://github.com/username
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs text-neutral-600">Telegram</div>
                                    <div className="mt-1 flex items-center gap-2 text-sm text-neutral-800">
                                        <IconLink className="h-4 w-4 text-neutral-600"/>
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

            {/* Completed posts */}
            <section className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
                            Completed posts
                        </h2>
                        <p className="mt-1 text-sm text-neutral-600">
                            Посты, помеченные как завершённые.
                        </p>
                    </div>
                    <div className="text-xs text-neutral-600">
                        {loading ? "Loading…" : `${completedPosts.length} items`}
                    </div>
                </div>

                {err ? (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-800">
                        {err}
                    </div>
                ) : loading ? (
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
        </main>
    );
}
