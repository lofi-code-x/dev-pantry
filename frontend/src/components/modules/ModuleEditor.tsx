"use client";

import React, {useEffect, useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {ApiError} from "@/lib/apiClient";
import {useAuth} from "@/components/auth/AuthProvider";
import type {UserRole} from "@/lib/types";

import {searchPosts, type Post} from "@/lib/api/posts";
import {
    createModule,
    updateModule,
    createModuleItem,
    deleteModuleItem,
    listModuleItems,
    type ModuleItem,
    type ModuleCreateRequest,
    type ModuleUpdateRequest,
    type ModuleItemCreateRequest,
} from "@/lib/api/modules";

import UploadImagesPanel, {type UploadedImage} from "@/components/posts/UploadImagesPanel";
import {listModuleImages} from "@/lib/api/uploads";

import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";

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

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

const ringHover =
    "transition-[transform,background-color,border-color,box-shadow] duration-150 " +
    "hover:-translate-y-[1px] " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/30 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

const cardBase = "card-gloss ring-1 ring-inset ring-border";

export default function ModuleEditor({
                                         mode,
                                         moduleId,
                                         initial,
                                         initialPosts,
                                     }: {
    mode: Mode;
    moduleId?: number;
    initial?: { title: string; description: string | null; is_published: boolean };
    initialPosts?: Post[];
}) {
    const router = useRouter();
    const {user, ready} = useAuth();

    // base fields
    const [title, setTitle] = useState(initial?.title ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);

    // ✅ module images: массив, но maxItems=1
    const [moduleImages, setModuleImages] = useState<UploadedImage[]>([]);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageErr, setImageErr] = useState<string | null>(null);

    // posts
    const [selected, setSelected] = useState<Post[]>(initialPosts ?? []);

    // search
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
        if (!isStaff(user.role)) router.replace("/learn");
    }, [user, ready, router]);

    // ✅ load module image on edit
    // ✅ load module image on edit
    useEffect(() => {
        if (!ready) return;
        if (!user) return;
        if (!canAccess) return;
        if (mode !== "edit") return;

        // ✅ FIX: сузили тип moduleId до number
        if (typeof moduleId !== "number" || !Number.isFinite(moduleId) || moduleId <= 0) {
            setModuleImages([]);
            return;
        }

        const mid = moduleId; // mid: number

        let cancelled = false;

        async function loadImg() {
            setImageLoading(true);
            setImageErr(null);
            try {
                const list = await listModuleImages(mid); // ✅ mid: number (TS ок)
                if (cancelled) return;

                const first = list?.[0] ?? null;

                if (first) {
                    setModuleImages([
                        {
                            id: String(first.id),
                            name: "module-image",
                            url: String(first.url),
                        },
                    ]);
                } else {
                    setModuleImages([]);
                }
            } catch (e: any) {
                if (cancelled) return;
                if (e instanceof ApiError) setImageErr(e.message);
                else setImageErr("Failed to load module image.");
            } finally {
                if (!cancelled) setImageLoading(false);
            }
        }

        loadImg();

        return () => {
            cancelled = true;
        };
    }, [ready, user?.id, canAccess, mode, moduleId]);


    // search posts
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
        if (mode === "edit" && !moduleId) return setErr("Missing moduleId.");

        const image_upload_id = moduleImages[0]?.id ?? null;

        setPending(true);
        try {
            if (mode === "create") {
                const body: ModuleCreateRequest = {
                    title: t,
                    description: description.trim() ? description.trim() : null,
                    author_id: user.id,
                    is_published: isPublished,
                    image_upload_id,
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

            const updateBody: ModuleUpdateRequest = {
                title: t,
                description: description.trim() ? description.trim() : null,
                image_upload_id,
            };
            await updateModule(moduleId!, updateBody);

            const currentItems: ModuleItem[] = await listModuleItems(moduleId!);
            for (const it of currentItems) await deleteModuleItem(it.id);

            for (let i = 0; i < selected.length; i++) {
                const p = selected[i];
                await createModuleItem({module_id: moduleId!, post_id: p.id, sort_order: i});
            }

            router.push(`/learn/${moduleId}`);
            router.refresh();
        } catch (e) {
            if (e instanceof ApiError) setErr(e.message);
            else setErr("Request failed.");
        } finally {
            setPending(false);
        }
    }

    if (!ready || !user) return null;

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-fg">
                    {mode === "create" ? "Create module" : "Edit module"}
                </h1>
                <p className="mt-2 text-sm text-muted-fg">
                    Fill module details, attach one cover image, and attach posts (no duplicates).
                </p>
            </header>

            {!canAccess ? (
                <section className={cn(cardBase, "p-6")}>
                    <div className="text-sm text-muted-fg">Access denied.</div>
                </section>
            ) : (
                <form onSubmit={onSubmit} className="grid gap-4">
                    <section className={cn(cardBase, "p-6")}>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-6">
                                <label className="block text-sm font-medium text-fg">Title</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="input mt-2"
                                    placeholder="Module title"
                                    disabled={pending}
                                />
                            </div>

                            <div className="lg:col-span-6">
                                <label className="block text-sm font-medium text-fg">Visibility</label>
                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        id="pub"
                                        type="checkbox"
                                        checked={isPublished}
                                        onChange={(e) => setIsPublished(e.target.checked)}
                                        className="h-4 w-4 accent-[hsl(var(--ring))]"
                                        disabled={pending}
                                    />
                                    <label htmlFor="pub" className="text-sm text-fg">
                                        Public
                                    </label>
                                    <span className="text-xs text-muted-fg">
                    {isPublished ? "Visible to all" : "Hidden (draft)"}
                  </span>
                                </div>
                            </div>

                            <div className="lg:col-span-12">
                                <label className="block text-sm font-medium text-fg">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="input mt-2"
                                    placeholder="Optional module description"
                                    disabled={pending}
                                />
                            </div>

                            <div className="lg:col-span-12">
                                <div className="mb-2">
                                    <div className="text-sm font-medium text-fg">Module image</div>
                                    <div className="text-xs text-muted-fg">One image per module (cover).</div>
                                </div>

                                {imageErr ? (
                                    <div
                                        className={cn(
                                            "mb-3 rounded-xl border p-3 text-sm text-fg",
                                            "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                                            "ring-1 ring-inset ring-ring/15"
                                        )}
                                    >
                                        {imageErr}
                                    </div>
                                ) : null}

                                {imageLoading ? <div className="mb-3 text-sm text-muted-fg">Loading image…</div> : null}

                                <UploadImagesPanel
                                    disabled={pending}
                                    value={moduleImages}
                                    onChange={(next) => setModuleImages(next.slice(0, 1))}
                                    maxItems={1}
                                />
                            </div>
                        </div>

                        {err ? (
                            <div
                                className={cn(
                                    "mt-4 rounded-xl border p-3 text-sm text-fg",
                                    "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                                    "ring-1 ring-inset ring-ring/15"
                                )}
                            >
                                {err}
                            </div>
                        ) : null}
                    </section>

                    {/* posts pickers */}
                    <section className="grid gap-4 lg:grid-cols-2">
                        {/* selected */}
                        <div className={cn(cardBase, "p-6")}>
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium text-fg">Selected posts</div>
                                    <div className="text-xs text-muted-fg">Order matters (sort_order).</div>
                                </div>
                                <div className="text-xs text-muted-fg">{selected.length} selected</div>
                            </div>

                            <div className="max-h-[50vh] overflow-auto pr-1">
                                {selected.length === 0 ? (
                                    <div className="text-sm text-muted-fg">No posts added yet.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {selected.map((p, idx) => (
                                            <li
                                                key={p.id}
                                                className={cn(
                                                    "rounded-xl p-3",
                                                    "ring-1 ring-inset ring-border",
                                                    "bg-[hsl(var(--ring)/0.03)]"
                                                )}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-medium text-fg">
                                                            {idx + 1}. {p.title}
                                                        </div>
                                                        <div
                                                            className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                              <span className="rounded-md border border-border bg-[hsl(var(--ring)/0.08)] px-2 py-0.5">
                                {p.category_tag}
                              </span>
                                                            <span>{p.author}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => move(p.id, -1)}
                                                            disabled={idx === 0 || pending}
                                                            className={cn(
                                                                "btn h-8 w-8 px-0",
                                                                ringHover,
                                                                "disabled:cursor-not-allowed disabled:opacity-50"
                                                            )}
                                                            title="Move up"
                                                            aria-label="Move up"
                                                        >
                                                            <ArrowUpwardIcon sx={{fontSize: 18}}/>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => move(p.id, 1)}
                                                            disabled={idx === selected.length - 1 || pending}
                                                            className={cn(
                                                                "btn h-8 w-8 px-0",
                                                                ringHover,
                                                                "disabled:cursor-not-allowed disabled:opacity-50"
                                                            )}
                                                            title="Move down"
                                                            aria-label="Move down"
                                                        >
                                                            <ArrowDownwardIcon sx={{fontSize: 18}}/>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => removePost(p.id)}
                                                            disabled={pending}
                                                            className={cn(
                                                                "btn h-8 w-8 px-0",
                                                                ringHover,
                                                                "hover:bg-[hsl(0_90%_55%/0.10)] hover:border-[hsl(0_90%_55%/0.45)] hover:ring-2 hover:ring-inset hover:ring-[hsl(0_90%_55%/0.28)]",
                                                                "disabled:cursor-not-allowed disabled:opacity-60"
                                                            )}
                                                            title="Remove"
                                                            aria-label="Remove"
                                                        >
                                                            <CloseIcon sx={{fontSize: 18}}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* search */}
                        <div className={cn(cardBase, "p-6")}>
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium text-fg">Add posts</div>
                                    <div className="text-xs text-muted-fg">Default: last 10 posts.</div>
                                </div>
                                <div className="text-xs text-muted-fg">
                                    {searchPending ? "Loading..." : `${results.length} results`}
                                </div>
                            </div>

                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="input"
                                placeholder="Search posts… (axum, jwt, sqlx)"
                                disabled={pending}
                            />

                            {searchErr ? (
                                <div
                                    className={cn(
                                        "mt-3 rounded-xl border p-3 text-sm text-fg",
                                        "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                                        "ring-1 ring-inset ring-ring/15"
                                    )}
                                >
                                    {searchErr}
                                </div>
                            ) : null}

                            <div className="mt-3 max-h-[50vh] overflow-auto pr-1">
                                {searchPending ? (
                                    <div className="text-sm text-muted-fg">Loading…</div>
                                ) : results.length === 0 ? (
                                    <div className="text-sm text-muted-fg">No posts found.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {results.map((p) => {
                                            const already = selectedIds.has(p.id);

                                            return (
                                                <li
                                                    key={p.id}
                                                    className={cn(
                                                        "rounded-xl p-3",
                                                        "ring-1 ring-inset ring-border",
                                                        "bg-[hsl(var(--ring)/0.03)]"
                                                    )}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div
                                                                className="truncate text-sm font-medium text-fg">{p.title}</div>
                                                            <div
                                                                className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                                <span
                                    className="rounded-md border border-border bg-[hsl(var(--ring)/0.08)] px-2 py-0.5">
                                  {p.category_tag}
                                </span>
                                                                <span>{p.author}</span>
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => addPost(p)}
                                                            disabled={already || pending}
                                                            className={cn(
                                                                "btn px-3 py-2 text-sm",
                                                                ringHover,
                                                                "disabled:cursor-not-allowed disabled:opacity-60"
                                                            )}
                                                            aria-label={already ? "Already added" : "Add post"}
                                                            title={already ? "Already added" : "Add post"}
                                                        >
                                                            {already ? (
                                                                <>
                                                                    <CheckIcon sx={{fontSize: 18}}
                                                                               className="text-muted-fg"/>
                                                                    Added
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <AddIcon sx={{fontSize: 18}}
                                                                             className="text-muted-fg"/>
                                                                    Add
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={pending}
                            className={cn("btn-primary px-4 py-2", "disabled:cursor-not-allowed disabled:opacity-60")}
                        >
                            {pending ? "Saving..." : mode === "create" ? "Create module" : "Save changes"}
                        </button>
                    </div>
                </form>
            )}
        </main>
    );
}
