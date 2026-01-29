// src/app/posts/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { PostPrimaryAction } from "@/components/posts/PostPrimaryAction";
import { PostCard } from "@/components/posts/PostCard";
import type { Category } from "@/lib/api/category";
import { getAllCategories } from "@/lib/api/category";
import type { Post, PostRequest } from "@/lib/api/posts";
import { searchPosts } from "@/lib/api/posts";
import { ApiError } from "@/lib/apiClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { listMyReads } from "@/lib/api/me";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

const PAGE_SIZE = 10;

export default function PostsExplorePage() {
    const { user, ready } = useAuth();

    const [query, setQuery] = useState("");
    const [tag, setTag] = useState<string>("all");

    const [categories, setCategories] = useState<Category[]>([]);
    const [catLoading, setCatLoading] = useState(false);

    const [items, setItems] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // post_id -> completed
    const [progressMap, setProgressMap] = useState<Map<number, boolean>>(new Map());

    const [error, setError] = useState<string | null>(null);

    // sentinel ref for infinite scroll
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    // загрузка категорий
    useEffect(() => {
        let cancelled = false;

        async function loadCats() {
            setCatLoading(true);
            try {
                const list = await getAllCategories();
                if (cancelled) return;

                const normalized = (list ?? [])
                    .map((c: any) => ({
                        tag: String(c.tag ?? "").trim(),
                        title: String(c.title ?? c.tag ?? "").trim(),
                    }))
                    .filter((c: Category) => c.tag && c.tag !== "all");

                setCategories(normalized);
            } finally {
                if (!cancelled) setCatLoading(false);
            }
        }

        loadCats();
        return () => {
            cancelled = true;
        };
    }, []);

    // ✅ загрузка прогресса пользователя (только completed) — один раз при логине/готовности
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

    // debounce query
    const debouncedQuery = useDebouncedValue(query, 250);

    const baseReq: Omit<PostRequest, "offset" | "limit"> = useMemo(
        () => ({
            query: debouncedQuery || undefined,
            tag: tag !== "all" ? tag : undefined,
        }),
        [debouncedQuery, tag]
    );

    // reload when filters change
    useEffect(() => {
        let cancelled = false;

        async function loadFirstPage() {
            setError(null);
            setLoading(true);
            setHasMore(true);

            try {
                const res = await searchPosts({
                    ...baseReq,
                    offset: 0,
                    limit: PAGE_SIZE,
                });

                if (cancelled) return;

                setItems(res);
                setHasMore(res.length >= PAGE_SIZE);
            } catch (e) {
                if (cancelled) return;
                setError(e instanceof ApiError ? e.message : "Failed to load posts.");
                setItems([]);
                setHasMore(false);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadFirstPage();
        return () => {
            cancelled = true;
        };
    }, [baseReq]);

    async function loadMore() {
        if (loading || loadingMore || !hasMore) return;

        setError(null);
        setLoadingMore(true);

        try {
            const nextOffset = items.length;

            const res = await searchPosts({
                ...baseReq,
                offset: nextOffset,
                limit: PAGE_SIZE,
            });

            setItems((prev) => {
                if (prev.length !== nextOffset) return prev;

                const seen = new Set(prev.map((p) => p.id));
                const appended = res.filter((p) => !seen.has(p.id));
                return [...prev, ...appended];
            });

            setHasMore(res.length >= PAGE_SIZE);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "Failed to load more posts.");
        } finally {
            setLoadingMore(false);
        }
    }

    // IntersectionObserver -> auto loadMore
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        if (loading) return;

        const obs = new IntersectionObserver(
            (entries) => {
                const e = entries[0];
                if (!e) return;
                if (e.isIntersecting) loadMore();
            },
            {
                root: null,
                rootMargin: "400px 0px",
                threshold: 0,
            }
        );

        obs.observe(el);
        return () => obs.disconnect();
    }, [loading, loadingMore, hasMore, items.length, baseReq]);

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-fg">Explore</h1>
                    <p className="mt-2 text-sm text-muted-fg">Поиск постов и лента публикаций.</p>
                </div>

                <PostPrimaryAction />
            </header>

            {/* Filters */}
            <section className={cn("card-gloss p-6", "ring-1 ring-inset ring-border")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-fg">Поиск</label>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="input mt-2"
                            placeholder="Например: axum, jwt, sqlx, next.js..."
                        />
                    </div>

                    <div className="w-full sm:w-64">
                        <label className="block text-sm font-medium text-fg">Категория</label>
                        <select
                            value={tag}
                            onChange={(e) => setTag(e.target.value)}
                            disabled={catLoading}
                            className={cn(
                                "input mt-2",
                                "disabled:cursor-not-allowed disabled:opacity-60"
                            )}
                        >
                            <option value="all">All</option>
                            {catLoading ? (
                                <option value="all">Loading…</option>
                            ) : (
                                categories.map((c) => (
                                    <option key={c.tag} value={c.tag}>
                                        {c.title}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                </div>
            </section>

            {/* Results */}
            <section className="mt-6 grid gap-4">
                {error ? (
                    <div className={cn("surface p-4 text-sm text-fg", "ring-1 ring-inset ring-ring/15", "bg-[hsl(var(--ring)/0.06)]")}>
                        {error}
                    </div>
                ) : null}

                {loading ? (
                    <div className={cn("surface p-6 text-sm text-muted-fg", "ring-1 ring-inset ring-border")}>Loading…</div>
                ) : items.length === 0 ? (
                    <div className={cn("surface p-6 text-sm text-muted-fg", "ring-1 ring-inset ring-border")}>
                        No posts found.
                    </div>
                ) : (
                    items.map((p) => (
                        <PostCard key={p.id} post={p} isCompleted={progressMap.get(p.id) === true} />
                    ))
                )}

                {/* sentinel for infinite scroll */}
                <div ref={sentinelRef} className="h-1" />

                {/* footer status */}
                {!loading && items.length > 0 ? (
                    <div className="flex justify-center pt-2">
                        <div className={cn("surface px-4 py-2 text-sm text-muted-fg", "ring-1 ring-inset ring-border")}>
                            {loadingMore ? "Loading…" : hasMore ? "Scroll to load more" : "No more"}
                        </div>
                    </div>
                ) : null}
            </section>
        </main>
    );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
    const [v, setV] = useState(value);

    useEffect(() => {
        const t = setTimeout(() => setV(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);

    return v;
}
