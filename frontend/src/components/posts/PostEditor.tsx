// src/components/posts/PostEditor.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MdEditor from "@/components/posts/MdEditor";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/apiClient";
import type { PostCreateRequest } from "@/lib/api/posts";
import { createPost, suggestPost, updatePost } from "@/lib/api/posts";
import UploadImagesPanel from "@/components/posts/UploadImagesPanel";
import { getAllCategories } from "@/lib/api/category";

// ✅ Icons (MUI)
import PublishIcon from "@mui/icons-material/Publish";
import SendIcon from "@mui/icons-material/Send";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import LightbulbOutlineIcon from "@mui/icons-material/LightbulbOutline";

type Mode = "create" | "suggest" | "edit";

const STAFF_ROLES = ["admin", "moderator", "editor"] as const;

type Category = {
    tag: string;
    title: string;
};

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function isStaff(role: unknown) {
    return (STAFF_ROLES as readonly string[]).includes(String(role).toLowerCase());
}

// shared look
const ringHover =
    "transition-[transform,background-color,border-color,box-shadow] duration-150 " +
    "hover:-translate-y-[1px] " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/30 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

const cardBase = "card-gloss ring-1 ring-inset ring-border";

export default function PostEditor({
                                       mode,
                                       postId,
                                       initial,
                                   }: {
    mode: Mode;
    postId?: number;
    initial?: Partial<PostCreateRequest>;
}) {
    const router = useRouter();
    const { user } = useAuth();

    const [title, setTitle] = useState(initial?.title ?? "");
    const [categoryTag, setCategoryTag] = useState(initial?.category_tag ?? "");
    const [content, setContent] = useState(initial?.content_markdown ?? "");

    const [categories, setCategories] = useState<Category[]>([]);
    const [catLoading, setCatLoading] = useState(false);

    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canAccess = useMemo(() => {
        if (!user) return false;
        if (mode === "suggest") return true;
        return isStaff(user.role);
    }, [user, mode]);

    const heading = mode === "create" ? "New post" : mode === "suggest" ? "Suggest post" : "Edit post";

    const subtitle =
        mode === "create"
            ? "This post will be published immediately."
            : mode === "suggest"
                ? "Your suggestion will be saved as private and can be published after review."
                : "Update the post content.";

    const submitLabel = mode === "create" ? "Publish" : mode === "suggest" ? "Submit suggestion" : "Save changes";

    const submitIcon =
        mode === "create" ? (
            <PublishIcon sx={{ fontSize: 18 }} className="text-primary-fg" />
        ) : mode === "suggest" ? (
            <SendIcon sx={{ fontSize: 18 }} className="text-primary-fg" />
        ) : (
            <SaveIcon sx={{ fontSize: 18 }} className="text-primary-fg" />
        );

    const headingIcon =
        mode === "suggest" ? (
            <LightbulbOutlineIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
        ) : (
            <EditIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
        );

    // Load categories (dropdown options)
    useEffect(() => {
        let cancelled = false;

        async function load() {
            setCatLoading(true);
            try {
                const list = await getAllCategories();
                if (cancelled) return;

                const normalized = (list ?? []).map((c: any) => ({
                    tag: String(c.tag ?? "").trim(),
                    title: String(c.title ?? c.tag ?? "").trim(),
                }));

                setCategories(normalized);

                // если tag пустой, но категории есть — выберем первую
                if (!categoryTag && normalized.length) {
                    setCategoryTag(normalized[0].tag);
                }
            } catch {
                // best-effort: не блокируем редактор
            } finally {
                if (!cancelled) setCatLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!user) {
            setError("Please log in.");
            return;
        }
        if (!canAccess) {
            setError("You don't have permission.");
            return;
        }
        if (mode === "edit" && !postId) {
            setError("Missing postId.");
            return;
        }

        const body: PostCreateRequest = {
            title: title.trim(),
            category_tag: categoryTag.trim(),
            author:
                mode === "edit"
                    ? (initial?.author?.trim() || user.login) // сохраняем автора поста при edit
                    : user.login,
            content_markdown: content,
        };

        if (!body.title) return setError("Title is required.");
        if (!body.category_tag) return setError("Category is required.");
        if (!body.content_markdown.trim()) return setError("Content is required.");

        setPending(true);
        try {
            let id: number;
            if (mode === "create") id = await createPost(body);
            else if (mode === "suggest") id = await suggestPost(body);
            else id = await updatePost(postId!, body);

            router.push(`/posts/${id}`);
            router.refresh();
        } catch (err) {
            if (err instanceof ApiError) setError(err.message);
            else setError("Request failed.");
        } finally {
            setPending(false);
        }
    }

    if (!user) return null;

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-6">
                <div className="flex items-center gap-2">
          <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", cardBase, "p-0")}>
            {headingIcon}
          </span>
                    <h1 className="text-2xl font-semibold tracking-tight text-fg">{heading}</h1>
                </div>
                <p className="mt-2 text-sm text-muted-fg">{subtitle}</p>
            </header>

            {!canAccess ? (
                <section className={cn(cardBase, "p-6")}>
                    <div className="text-sm text-muted-fg">Access denied.</div>
                </section>
            ) : (
                <form onSubmit={onSubmit} className="grid gap-4">
                    {/* Top control panel */}
                    <section className={cn(cardBase, "p-6")}>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            {/* Title */}
                            <div className="lg:col-span-8">
                                <label className="block text-sm font-medium text-fg">Title</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="input mt-2"
                                    placeholder="Post title"
                                    disabled={pending}
                                />
                            </div>

                            {/* Category */}
                            <div className="lg:col-span-4">
                                <label className="block text-sm font-medium text-fg">Category</label>
                                <select
                                    value={categoryTag}
                                    onChange={(e) => setCategoryTag(e.target.value)}
                                    disabled={pending || catLoading || categories.length === 0}
                                    className={cn("input mt-2", "disabled:cursor-not-allowed disabled:opacity-60")}
                                >
                                    {catLoading ? (
                                        <option value="">Loading categories…</option>
                                    ) : categories.length === 0 ? (
                                        <option value="">No categories</option>
                                    ) : (
                                        categories.map((c) => (
                                            <option key={c.tag} value={c.tag}>
                                                {c.title} ({c.tag})
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            {/* Upload images full width */}
                            <div className="lg:col-span-12">
                                <UploadImagesPanel disabled={pending} />
                            </div>
                        </div>

                        {error ? (
                            <div
                                className={cn(
                                    "mt-5 rounded-xl border p-4 text-sm text-fg",
                                    "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                                    "ring-1 ring-inset ring-ring/15"
                                )}
                            >
                                {error}
                            </div>
                        ) : null}
                    </section>

                    {/* Editor */}
                    <section className={cn(cardBase, "p-3")}>
                        <MdEditor value={content} onChange={setContent} />
                    </section>

                    {/* Bottom actions */}
                    <div className="flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={pending}
                            className={cn(
                                "btn-primary px-4 py-2",
                                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55",
                                "disabled:cursor-not-allowed disabled:opacity-60"
                            )}
                        >
                            {submitIcon}
                            {pending ? "Saving..." : submitLabel}
                        </button>
                    </div>
                </form>
            )}
        </main>
    );
}
