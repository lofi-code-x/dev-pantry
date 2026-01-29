// src/components/category/CategoryManageModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import type { Category } from "@/lib/api/category";
import { createCategory, deleteCategory, getAllCategories } from "@/lib/api/category";

// ✅ Google (MUI) icons
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

const ringHover =
    "transition-[transform,background-color,border-color,box-shadow] duration-150 " +
    "hover:-translate-y-[1px] " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/30 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

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
            setItems((list ?? []).filter((c) => String((c as any).tag ?? "") !== "all"));
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
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
        >
            <div className={cn("w-full max-w-xl card-gloss", "ring-1 ring-inset ring-border")}>
                <div className="flex items-start justify-between gap-4 border-b border-border p-4">
                    <div>
                        <div className="text-base font-semibold text-fg">Manage categories</div>
                        <div className="mt-1 text-sm text-muted-fg">Add a new category or delete existing ones.</div>
                    </div>

                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className={cn(
                            "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-fg",
                            ringHover
                        )}
                        aria-label="Close"
                    >
                        <CloseIcon sx={{ fontSize: 20 }} />
                    </button>
                </div>

                <div className="p-4">
                    {/* Create */}
                    <form onSubmit={onCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-fg">New category title</label>
                            <input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="e.g. Backend"
                                className="input mt-2"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={pendingCreate || !newTitle.trim()}
                            className={cn("btn-primary", "disabled:cursor-not-allowed disabled:opacity-60")}
                        >
                            {pendingCreate ? "Adding..." : "Add"}
                        </button>
                    </form>

                    {/* Error */}
                    {error ? (
                        <div
                            className={cn(
                                "mt-4 rounded-xl border p-3 text-sm text-fg",
                                "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                                "ring-1 ring-inset ring-ring/15"
                            )}
                        >
                            {error}
                        </div>
                    ) : null}

                    {/* List */}
                    <div className="mt-4">
                        <div className="text-sm font-medium text-fg">All categories</div>

                        <div className={cn("mt-2 max-h-85 overflow-auto rounded-xl", "ring-1 ring-inset ring-border")}>
                            <div className="bg-[hsl(var(--ring)/0.03)]">
                                {loading ? (
                                    <div className="p-3 text-sm text-muted-fg">Loading…</div>
                                ) : sorted.length === 0 ? (
                                    <div className="p-3 text-sm text-muted-fg">No categories.</div>
                                ) : (
                                    <ul className="divide-y divide-border">
                                        {sorted.map((c) => (
                                            <li key={c.tag} className="flex items-center gap-3 p-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium text-fg">{c.title}</div>
                                                    <div className="truncate text-xs text-muted-fg">{c.tag}</div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(c.tag)}
                                                    disabled={pendingDeleteTag === c.tag}
                                                    className={cn(
                                                        "btn text-xs px-2 py-1.5",
                                                        ringHover,
                                                        "disabled:cursor-not-allowed disabled:opacity-60",
                                                        // delete accent (keeps theme)
                                                        "hover:bg-[hsl(0_90%_55%/0.10)] hover:border-[hsl(0_90%_55%/0.45)] hover:ring-2 hover:ring-inset hover:ring-[hsl(0_90%_55%/0.28)]"
                                                    )}
                                                    aria-label={`Delete category ${c.title}`}
                                                >
                                                    <DeleteOutlineIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                                    {pendingDeleteTag === c.tag ? "Deleting..." : "Delete"}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="mt-2 text-xs text-muted-fg">
                            Note: deleting a category may fail if posts reference it (depends on backend constraints).
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border p-4">
                    <button type="button" onClick={load} className={cn("btn", ringHover)}>
                        Refresh
                    </button>

                    <button type="button" onClick={() => onOpenChange(false)} className="btn-primary">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
