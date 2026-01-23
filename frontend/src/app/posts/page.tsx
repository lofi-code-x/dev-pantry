// src/app/posts/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PostPrimaryAction } from "@/components/posts/PostPrimaryAction";
import { PostCard } from "@/components/posts/PostCard";
import type { Category } from "@/lib/api/category";
import { getAllCategories } from "@/lib/api/category";
import type { Post, PostRequest } from "@/lib/api/posts";
import { searchPosts } from "@/lib/api/posts";
import { ApiError } from "@/lib/apiClient";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

const PAGE_SIZE = 10;

export default function PostsExplorePage() {
    const [query, setQuery] = useState("");
    const [tag, setTag] = useState<string>("all");

    const [categories, setCategories] = useState<Category[]>([]);
    const [catLoading, setCatLoading] = useState(false);

    const [items, setItems] = useState<Post[]>([]);
    const [offset, setOffset] = useState(0);

    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const [error, setError] = useState<string | null>(null);

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

    // дебаунс query (простая версия)
    const debouncedQuery = useDebouncedValue(query, 250);

    const params: PostRequest = useMemo(
        () => ({
            query: debouncedQuery || undefined,
            tag: tag !== "all" ? tag : undefined,
            offset,
            limit: PAGE_SIZE,
        }),
        [debouncedQuery, tag, offset]
    );

    // initial load / reload when filters change (query/tag)
    useEffect(() => {
        // при смене query/tag сбрасываем ленту и offset
        setOffset(0);
    }, [debouncedQuery, tag]);

    useEffect(() => {
        let cancelled = false;

        async function loadFirstPage() {
            // грузим только когда offset=0 (после сброса)
            if (offset !== 0) return;

            setError(null);
            setLoading(true);
            try {
                const res = await searchPosts({
                    query: params.query,
                    tag: params.tag,
                    offset: 0,
                    limit: PAGE_SIZE,
                });

                if (cancelled) return;

                // если бэк не возвращает "limit+1", то просто определяем hasMore по размеру
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedQuery, tag, offset === 0]);

    async function loadMore() {
        if (loadingMore || loading || !hasMore) return;

        setError(null);
        setLoadingMore(true);
        try {
            const nextOffset = items.length;
            const res = await searchPosts({
                query: debouncedQuery || undefined,
                tag: tag !== "all" ? tag : undefined,
                offset: nextOffset,
                limit: PAGE_SIZE,
            });

            setItems((prev) => [...prev, ...res]);
            setHasMore(res.length >= PAGE_SIZE);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "Failed to load more posts.");
        } finally {
            setLoadingMore(false);
        }
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Explore</h1>
                    <p className="mt-2 text-sm text-neutral-600">Поиск постов и лента публикаций.</p>
                </div>

                <PostPrimaryAction />
            </header>

            <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-neutral-950">Поиск</label>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                            placeholder="Например: axum, jwt, sqlx, next.js..."
                        />
                    </div>

                    <div className="w-full sm:w-64">
                        <label className="block text-sm font-medium text-neutral-950">Категория</label>
                        <select
                            value={tag}
                            onChange={(e) => setTag(e.target.value)}
                            disabled={catLoading}
                            className={cn(
                                "mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950",
                                "focus:outline-none focus:ring-2 focus:ring-neutral-200",
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

            <section className="mt-6 grid gap-4">
                {error ? (
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-800">
                        {error}
                    </div>
                ) : null}

                {loading ? (
                    <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700 shadow-sm">
                        Loading…
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-700 shadow-sm">
                        No posts found.
                    </div>
                ) : (
                    items.map((p) => <PostCard key={p.id} post={p} />)
                )}

                {!loading && items.length > 0 ? (
                    <div className="flex justify-center pt-2">
                        <button
                            type="button"
                            onClick={loadMore}
                            disabled={!hasMore || loadingMore}
                            className={cn(
                                "inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium",
                                "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200",
                                "disabled:cursor-not-allowed disabled:opacity-60"
                            )}
                        >
                            {loadingMore ? "Loading…" : hasMore ? "Load more" : "No more"}
                        </button>
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
