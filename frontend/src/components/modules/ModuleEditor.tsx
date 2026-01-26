"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/apiClient";
import { useAuth } from "@/components/auth/AuthProvider";
import type { UserRole } from "@/lib/types";

import { searchPosts, type Post } from "@/lib/api/posts";
import {
    createModule,
    updateModule,
    createModuleItem,
    deleteModuleItem,
    // Нужны для edit, чтобы пересобрать items корректно:
    listModuleItems,
    type ModuleItem,
    type ModuleCreateRequest,
    type ModuleUpdateRequest,
    type ModuleItemCreateRequest,
} from "@/lib/api/modules";

type Mode = "create" | "edit";

const STAFF_ROLES: UserRole[] = ["admin", "moderator", "editor"];
function isStaff(role: unknown) {
    return STAFF_ROLES.includes(String(role).toLowerCase() as UserRole);
}

function useDebounced<T>(value: T, delayMs: number) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = window.setTimeout(() => setV(value), delayMs);
        return () => window.clearTimeout(t);
    }, [value, delayMs]);
    return v;
}

export default function ModuleEditor({
                                         mode,
                                         moduleId,
                                         initial,
                                         initialPosts,
                                     }: {
    mode: Mode;
    moduleId?: number;
    initial?: {
        title: string;
        description: string | null;
        is_published: boolean;
    };
    initialPosts?: Post[];
}) {
    const router = useRouter();
    const { user, ready } = useAuth();

    // базовые поля
    const [title, setTitle] = useState(initial?.title ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);

    // выбранные посты
    const [selected, setSelected] = useState<Post[]>(initialPosts ?? []);

    // поиск постов
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounced(query, 250);
    const [results, setResults] = useState<Post[]>([]);
    const [searchPending, setSearchPending] = useState(true);
    const [searchErr, setSearchErr] = useState<string | null>(null);

    // submit
    const [pending, setPending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const canAccess = useMemo(() => {
        if (!ready) return false;
        if (!user) return false;
        return isStaff(user.role);
    }, [user, ready]);

    const selectedIds = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);

    // guard
    useEffect(() => {
        if (!ready) return;
        if (!user) {
            router.replace("/login");
            return;
        }
        if (!isStaff(user.role)) {
            router.replace("/learn");
        }
    }, [user, ready, router]);

    // default load: last 10 posts, or search by query
    useEffect(() => {
        let cancelled = false;

        async function run() {
            setSearchPending(true);
            setSearchErr(null);
            try {
                const res = await searchPosts({
                    query: debouncedQuery ? debouncedQuery : undefined,
                    offset: 0,
                    limit: 10,
                });
                if (!cancelled) setResults(res);
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError) setSearchErr(e.message);
                else setSearchErr("Failed to load posts.");
            } finally {
                if (!cancelled) setSearchPending(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [debouncedQuery]);

    function addPost(p: Post) {
        if (selectedIds.has(p.id)) return;
        setSelected((prev) => [...prev, p]);
    }

    function removePost(postId: number) {
        setSelected((prev) => prev.filter((p) => p.id !== postId));
    }

    function move(postId: number, dir: -1 | 1) {
        setSelected((prev) => {
            const idx = prev.findIndex((p) => p.id === postId);
            if (idx < 0) return prev;
            const nextIdx = idx + dir;
            if (nextIdx < 0 || nextIdx >= prev.length) return prev;
            const copy = prev.slice();
            const tmp = copy[idx];
            copy[idx] = copy[nextIdx];
            copy[nextIdx] = tmp;
            return copy;
        });
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);

        if (!user) return;
        if (!canAccess) return setErr("You don't have permission.");

        const t = title.trim();
        if (!t) return setErr("Title is required.");

        if (mode === "edit" && !moduleId) {
            return setErr("Missing moduleId.");
        }

        setPending(true);
        try {
            if (mode === "create") {
                const body: ModuleCreateRequest = {
                    title: t,
                    description: description.trim() ? description.trim() : null,
                    author_id: user.id,
                    is_published: isPublished,
                };

                const newId = await createModule(body);

                for (let i = 0; i < selected.length; i++) {
                    const p = selected[i];
                    const itemBody: ModuleItemCreateRequest = {
                        module_id: newId,
                        post_id: p.id,
                        sort_order: i,
                    };
                    await createModuleItem(itemBody);
                }

                router.push(`/learn/${newId}`);
                router.refresh();
                return;
            }

            // ---------------- EDIT ----------------
            // 1) update module fields
            const updateBody: ModuleUpdateRequest = {
                title: t,
                description: description.trim() ? description.trim() : null,
                // is_published: isPublished  <-- если update API не поддерживает, меняй отдельным set-public
            };
            await updateModule(moduleId!, updateBody);

            // 2) sync module items:
            // стратегия: удалить все item записи и создать заново в порядке selected
            const currentItems: ModuleItem[] = await listModuleItems(moduleId!);
            for (const it of currentItems) {
                await deleteModuleItem(it.id);
            }
            for (let i = 0; i < selected.length; i++) {
                const p = selected[i];
                await createModuleItem({
                    module_id: moduleId!,
                    post_id: p.id,
                    sort_order: i,
                });
            }

            // 3) visibility
            // если у тебя есть setModulePublic — можно вызвать тут (опционально)
            // await setModulePublic(moduleId!, isPublished);

            router.push(`/learn/${moduleId}`);
            router.refresh();
        } catch (e) {
            if (e instanceof ApiError) setErr(e.message);
            else setErr("Request failed.");
        } finally {
            setPending(false);
        }
    }

    if (!ready) return null;
    if (!user) return null;

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
                    {mode === "create" ? "Create module" : "Edit module"}
                </h1>
                <p className="mt-2 text-sm text-neutral-600">
                    Fill module details and attach posts (no duplicates).
                </p>
            </header>

            {!canAccess ? (
                <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="text-sm text-neutral-700">Access denied.</div>
                </section>
            ) : (
                <form onSubmit={onSubmit} className="grid gap-4">
                    {/* базовые поля */}
                    <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-6">
                                <label className="block text-sm font-medium text-neutral-950">Title</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                                    placeholder="Module title"
                                />
                            </div>

                            <div className="lg:col-span-6">
                                <label className="block text-sm font-medium text-neutral-950">Visibility</label>
                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        id="pub"
                                        type="checkbox"
                                        checked={isPublished}
                                        onChange={(e) => setIsPublished(e.target.checked)}
                                        className="h-4 w-4"
                                    />
                                    <label htmlFor="pub" className="text-sm text-neutral-950">
                                        Public
                                    </label>
                                    <span className="text-xs text-neutral-600">
                    {isPublished ? "Visible to all" : "Hidden (draft)"}
                  </span>
                                </div>
                            </div>

                            <div className="lg:col-span-12">
                                <label className="block text-sm font-medium text-neutral-950">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                                    placeholder="Optional module description"
                                />
                            </div>
                        </div>

                        {err ? (
                            <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
                                {err}
                            </div>
                        ) : null}
                    </section>

                    {/* выбор постов */}
                    <section className="grid gap-4 lg:grid-cols-2">
                        {/* selected */}
                        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium text-neutral-950">Selected posts</div>
                                    <div className="text-xs text-neutral-600">Order matters (sort_order).</div>
                                </div>
                                <div className="text-xs text-neutral-600">{selected.length} selected</div>
                            </div>

                            <div className="max-h-[50vh] overflow-auto pr-1">
                                {selected.length === 0 ? (
                                    <div className="text-sm text-neutral-600">No posts added yet.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {selected.map((p, idx) => (
                                            <li
                                                key={p.id}
                                                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium text-neutral-950">
                                                        {idx + 1}. {p.title}
                                                    </div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                            <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5">
                              {p.category_tag}
                            </span>
                                                        <span>{p.author}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => move(p.id, -1)}
                                                        disabled={idx === 0}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                                                        title="Move up"
                                                    >
                                                        ↑
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => move(p.id, 1)}
                                                        disabled={idx === selected.length - 1}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                                                        title="Move down"
                                                    >
                                                        ↓
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removePost(p.id)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                                                        title="Remove"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* search */}
                        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium text-neutral-950">Add posts</div>
                                    <div className="text-xs text-neutral-600">Default: last 10 posts.</div>
                                </div>
                                <div className="text-xs text-neutral-600">
                                    {searchPending ? "Loading..." : `${results.length} results`}
                                </div>
                            </div>

                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                                placeholder="Search posts… (axum, jwt, sqlx)"
                            />

                            {searchErr ? (
                                <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
                                    {searchErr}
                                </div>
                            ) : null}

                            <div className="mt-3 max-h-[50vh] overflow-auto pr-1">
                                {searchPending ? (
                                    <div className="text-sm text-neutral-600">Loading…</div>
                                ) : results.length === 0 ? (
                                    <div className="text-sm text-neutral-600">No posts found.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {results.map((p) => {
                                            const already = selectedIds.has(p.id);
                                            return (
                                                <li
                                                    key={p.id}
                                                    className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-medium text-neutral-950">
                                                            {p.title}
                                                        </div>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                              <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5">
                                {p.category_tag}
                              </span>
                                                            <span>{p.author}</span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => addPost(p)}
                                                        disabled={already}
                                                        className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        {already ? "Added" : "Add"}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* submit */}
                    <div className="flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={pending}
                            className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                        >
                            {pending ? "Saving..." : mode === "create" ? "Create module" : "Save changes"}
                        </button>
                    </div>
                </form>
            )}
        </main>
    );
}
