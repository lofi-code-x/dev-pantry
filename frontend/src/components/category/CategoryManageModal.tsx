// src/components/category/CategoryManageModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import type { Category } from "@/lib/api/category";
import { createCategory, deleteCategory, getAllCategories } from "@/lib/api/category";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function IconX(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function IconTrash(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path
                d="M9 3h6m-9 4h12m-1 0-1 14H8L7 7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M10 11v7M14 11v7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function CategoryManageModal({
                                                open,
                                                onOpenChange,
                                            }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
}) {
    const [items, setItems] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);

    const [newTitle, setNewTitle] = useState("");
    const [pendingCreate, setPendingCreate] = useState(false);
    const [pendingDeleteTag, setPendingDeleteTag] = useState<string | null>(null);

    const [error, setError] = useState<string | null>(null);

    async function load() {
        setError(null);
        setLoading(true);
        try {
            const list = await getAllCategories();
            setItems(
                (list ?? []).filter((c) => String((c as any).tag ?? "") !== "all")
            );
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "Failed to load categories.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!open) return;
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const sorted = useMemo(() => {
        const arr = [...items];
        arr.sort((a, b) => String(a.title).localeCompare(String(b.title)));
        return arr;
    }, [items]);

    async function onCreate(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const title = newTitle.trim();
        if (!title) return;

        setPendingCreate(true);
        try {
            const created = await createCategory({ title });
            setItems((prev) => [created, ...prev]);
            setNewTitle("");
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "Create failed.");
        } finally {
            setPendingCreate(false);
        }
    }

    async function onDelete(tag: string) {
        setError(null);
        setPendingDeleteTag(tag);
        try {
            await deleteCategory(tag);
            setItems((prev) => prev.filter((c) => c.tag !== tag));
        } catch (e) {
            setError(e instanceof ApiError ? e.message : "Delete failed.");
        } finally {
            setPendingDeleteTag(null);
        }
    }

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 px-4"
            role="dialog"
            aria-modal="true"
        >
            <div className="w-full max-w-xl rounded-xl border border-neutral-200 bg-white shadow-lg">
                <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-4">
                    <div>
                        <div className="text-base font-semibold text-neutral-950">Manage categories</div>
                        <div className="mt-1 text-sm text-neutral-600">
                            Add a new category or delete existing ones.
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                        aria-label="Close"
                    >
                        <IconX className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-4">
                    {/* Create */}
                    <form onSubmit={onCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-neutral-950">New category title</label>
                            <input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="e.g. Backend"
                                className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={pendingCreate || !newTitle.trim()}
                            className={cn(
                                "inline-flex items-center justify-center rounded-lg border border-neutral-200",
                                "bg-neutral-950 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-900",
                                "disabled:cursor-not-allowed disabled:opacity-60",
                                "focus:outline-none focus:ring-2 focus:ring-neutral-200"
                            )}
                        >
                            {pendingCreate ? "Adding..." : "Add"}
                        </button>
                    </form>

                    {/* Error */}
                    {error ? (
                        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
                            {error}
                        </div>
                    ) : null}

                    {/* List */}
                    <div className="mt-4">
                        <div className="text-sm font-medium text-neutral-950">All categories</div>

                        <div className="mt-2 max-h-85 overflow-auto rounded-lg border border-neutral-200">
                            {loading ? (
                                <div className="p-3 text-sm text-neutral-700">Loading…</div>
                            ) : sorted.length === 0 ? (
                                <div className="p-3 text-sm text-neutral-700">No categories.</div>
                            ) : (
                                <ul className="divide-y divide-neutral-200">
                                    {sorted.map((c) => (
                                        <li key={c.tag} className="flex items-center gap-3 p-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-medium text-neutral-950">
                                                    {c.title}
                                                </div>
                                                <div className="truncate text-xs text-neutral-600">{c.tag}</div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => onDelete(c.tag)}
                                                disabled={pendingDeleteTag === c.tag}
                                                className={cn(
                                                    "inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs font-medium",
                                                    "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200",
                                                    "disabled:cursor-not-allowed disabled:opacity-60"
                                                )}
                                                aria-label={`Delete category ${c.title}`}
                                            >
                                                <IconTrash className="h-4 w-4 text-neutral-700" />
                                                {pendingDeleteTag === c.tag ? "Deleting..." : "Delete"}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="mt-2 text-xs text-neutral-600">
                            Note: deleting a category may fail if posts reference it (depends on backend constraints).
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-4">
                    <button
                        type="button"
                        onClick={load}
                        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    >
                        Refresh
                    </button>

                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="rounded-lg border border-neutral-200 bg-neutral-950 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
