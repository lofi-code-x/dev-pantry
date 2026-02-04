// src/app/admin/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/apiClient";
import {
    deleteUser,
    listAdminUsers,
    updateUserRole,
    type AdminUserListItem,
} from "@/lib/api/admin";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
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

function nextRole(role: string): string | null {
    const r = role.toLowerCase();
    if (r === "user") return "editor";
    if (r === "editor") return "moderator";
    return null;
}

type AdminTab = "users" | "stats";

export default function AdminPage() {
    const router = useRouter();
    const { user, ready } = useAuth();

    const [rows, setRows] = useState<AdminUserListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [total, setTotal] = useState(0);
    const [tab, setTab] = useState<AdminTab>("users");

    useEffect(() => {
        if (!ready) return;
        if (!user) {
            router.replace("/login");
            return;
        }
        if (String(user.role).toLowerCase() !== "admin") {
            router.replace("/");
        }
    }, [ready, user, router]);

    useEffect(() => {
        if (!ready || !user || String(user.role).toLowerCase() !== "admin") return;
        if (tab !== "users") return;

        let cancelled = false;

        async function load() {
            setErr(null);
            setLoading(true);
            try {
                const res = await listAdminUsers(page, limit);
                if (cancelled) return;
                setRows(res.items);
                setTotal(res.total);
            } catch (e) {
                if (cancelled) return;
                setErr(e instanceof ApiError ? e.message : "Failed to load users.");
                setRows([]);
                setTotal(0);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [ready, user, page, limit, tab]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
    const canPrev = page > 1;
    const canNext = page < totalPages;

    if (!ready) return null;
    if (!user || String(user.role).toLowerCase() !== "admin") return null;

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <section
                className={cn(
                    "rounded-xl border border-border bg-card p-6 shadow-sm",
                    "ring-1 ring-inset ring-border"
                )}
            >
                <div className="text-xl font-semibold tracking-tight text-fg">Admin panel</div>
                <div className="mt-1 text-sm text-muted-fg">Manage platform data</div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setTab("users")}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
                            "transition-[background-color,border-color] duration-150",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55",
                            tab === "users"
                                ? "border-primary bg-primary text-primary-fg"
                                : "border-border bg-card text-fg hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)]"
                        )}
                    >
                        User list
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("stats")}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
                            "transition-[background-color,border-color] duration-150",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55",
                            tab === "stats"
                                ? "border-primary bg-primary text-primary-fg"
                                : "border-border bg-card text-fg hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)]"
                        )}
                    >
                        Statistic
                    </button>
                </div>

                {tab === "users" ? (
                    <>
                        <div className={cn("mt-5 surface p-4", "ring-1 ring-inset ring-border")}>
                            {err ? (
                                <div
                                    className={cn(
                                        "surface p-4 text-sm text-fg",
                                        "ring-1 ring-inset ring-ring/15",
                                        "bg-[hsl(var(--ring)/0.06)]"
                                    )}
                                >
                                    {err}
                                </div>
                            ) : loading ? (
                                <div className="text-sm text-muted-fg">Loading…</div>
                            ) : rows.length === 0 ? (
                                <div className="text-sm text-muted-fg">No users.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="text-xs text-muted-fg">
                                            <tr className="border-b border-border">
                                                <th className="py-3 pr-3 font-medium">Login</th>
                                                <th className="py-3 pr-3 font-medium">Created</th>
                                                <th className="py-3 text-right font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((u) => {
                                                const promoteTo = nextRole(u.role);
                                                const canPromote = Boolean(promoteTo);
                                                const isAdmin = String(u.role).toLowerCase() === "admin";

                                                return (
                                                    <tr key={u.id} className="border-b border-border/70 last:border-0">
                                                        <td className="py-3 pr-3 text-fg">{u.login}</td>
                                                        <td className="py-3 pr-3 text-muted-fg">
                                                            {formatDate(u.created_at)}
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    disabled={!canPromote}
                                                                    onClick={async () => {
                                                                        if (!promoteTo) return;
                                                                        setErr(null);
                                                                        setLoading(true);
                                                                        try {
                                                                            await updateUserRole(u.id, promoteTo);
                                                                            const res = await listAdminUsers(page, limit);
                                                                            setRows(res.items);
                                                                            setTotal(res.total);
                                                                        } catch (e) {
                                                                            setErr(
                                                                                e instanceof ApiError
                                                                                    ? e.message
                                                                                    : "Failed to update role."
                                                                            );
                                                                        } finally {
                                                                            setLoading(false);
                                                                        }
                                                                    }}
                                                                    className={cn(
                                                                        "inline-flex items-center justify-center rounded-md border px-2 py-1",
                                                                        "border-border bg-card text-fg hover:bg-[hsl(var(--ring)/0.10)]",
                                                                        "disabled:cursor-not-allowed disabled:opacity-60"
                                                                    )}
                                                                    aria-label="Promote user"
                                                                    title={
                                                                        canPromote ? `Promote to ${promoteTo}` : "No promotion"
                                                                    }
                                                                >
                                                                    <ArrowUpwardIcon sx={{ fontSize: 18 }} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isAdmin}
                                                                    onClick={async () => {
                                                                        if (isAdmin) return;
                                                                        if (!window.confirm(`Delete user ${u.login}?`)) return;
                                                                        setErr(null);
                                                                        setLoading(true);
                                                                        try {
                                                                            await deleteUser(u.id);
                                                                            const res = await listAdminUsers(page, limit);
                                                                            setRows(res.items);
                                                                            setTotal(res.total);
                                                                        } catch (e) {
                                                                            setErr(
                                                                                e instanceof ApiError
                                                                                    ? e.message
                                                                                    : "Failed to delete user."
                                                                            );
                                                                        } finally {
                                                                            setLoading(false);
                                                                        }
                                                                    }}
                                                                    className={cn(
                                                                        "inline-flex items-center justify-center rounded-md border px-2 py-1",
                                                                        "border-border bg-card text-fg hover:bg-[hsl(var(--ring)/0.10)]",
                                                                        "disabled:cursor-not-allowed disabled:opacity-60"
                                                                    )}
                                                                    aria-label="Delete user"
                                                                    title={isAdmin ? "Cannot delete admin" : "Delete user"}
                                                                >
                                                                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex items-center justify-between text-sm text-muted-fg">
                            <div>
                                Page {page} of {totalPages} • {total} users
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={!canPrev}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className={cn("btn px-3 py-1.5", "disabled:cursor-not-allowed disabled:opacity-60")}
                                >
                                    Prev
                                </button>
                                <button
                                    type="button"
                                    disabled={!canNext}
                                    onClick={() => setPage((p) => p + 1)}
                                    className={cn("btn px-3 py-1.5", "disabled:cursor-not-allowed disabled:opacity-60")}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className={cn("mt-5 surface p-4", "ring-1 ring-inset ring-border")}>
                        <div className="text-sm text-muted-fg">Statistics will be here.</div>
                    </div>
                )}
            </section>
        </main>
    );
}
