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

    const heading =
        mode === "create" ? "New post" : mode === "suggest" ? "Suggest post" : "Edit post";

    const subtitle =
        mode === "create"
            ? "This post will be published immediately."
            : mode === "suggest"
                ? "Your suggestion will be saved as private and can be published after review."
                : "Update the post content.";

    const submitLabel =
        mode === "create" ? "Publish" : mode === "suggest" ? "Submit suggestion" : "Save changes";

    const submitIcon =
        mode === "create" ? (
            <PublishIcon sx={{ fontSize: 18 }} />
        ) : mode === "suggest" ? (
            <SendIcon sx={{ fontSize: 18 }} />
        ) : (
            <SaveIcon sx={{ fontSize: 18 }} />
        );

    const headingIcon =
        mode === "create" ? (
            <EditIcon sx={{ fontSize: 18 }} className="text-neutral-700" />
        ) : mode === "suggest" ? (
            <LightbulbOutlineIcon sx={{ fontSize: 18 }} className="text-neutral-700" />
        ) : (
            <EditIcon sx={{ fontSize: 18 }} className="text-neutral-700" />
        );

    // Load categories (dropdown options)
    useEffect(() => {
        let cancelled = false;

        async function load() {
            setCatLoading(true);
            try {
                const list = await getAllCategories();
                if (cancelled) return;

                // ожидаем формат [{ tag, title } ...]
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
                // не блокируем редактор: просто оставим список пустым
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
        <main className="mx-auto w-full max-w-6xl px-4 py-8">
            <header className="mb-6">
                <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white">
            {headingIcon}
          </span>
                    <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">{heading}</h1>
                </div>
                <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>
            </header>

            {!canAccess ? (
                <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                    <div className="text-sm text-neutral-700">Access denied.</div>
                </section>
            ) : (
                <form onSubmit={onSubmit} className="grid gap-4">
                    {/* Top control panel */}
                    <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            {/* Title + Category in one row */}
                            <div className="lg:col-span-8">
                                <label className="block text-sm font-medium text-neutral-950">Title</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                                    placeholder="Post title"
                                />
                            </div>

                            <div className="lg:col-span-4">
                                <label className="block text-sm font-medium text-neutral-950">Category</label>
                                <select
                                    value={categoryTag}
                                    onChange={(e) => setCategoryTag(e.target.value)}
                                    disabled={pending || catLoading || categories.length === 0}
                                    className={cn(
                                        "mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950",
                                        "focus:outline-none focus:ring-2 focus:ring-neutral-200",
                                        "disabled:cursor-not-allowed disabled:opacity-60"
                                    )}
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
                            <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-800">
                                {error}
                            </div>
                        ) : null}
                    </section>

                    {/* Editor */}
                    <section className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
                        <MdEditor value={content} onChange={setContent} />
                    </section>

                    {/* Bottom actions */}
                    <div className="flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={pending}
                            className={cn(
                                "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200",
                                "bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-900",
                                "disabled:cursor-not-allowed disabled:opacity-60",
                                "focus:outline-none focus:ring-2 focus:ring-neutral-200"
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
