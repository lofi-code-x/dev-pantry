// src/app/leaderboard/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, toAbsoluteUrl } from "@/lib/apiClient";
import { listLeaderboard, type LeaderboardUser } from "@/lib/api/leaderboard";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function initialLetter(login: string) {
    return (login.trim()[0] ?? "?").toUpperCase();
}

export default function LeaderboardPage() {
    const router = useRouter();
    const [rows, setRows] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setErr(null);
            setLoading(true);
            try {
                const res = await listLeaderboard();
                if (!cancelled) setRows(res);
            } catch (e) {
                if (cancelled) return;
                setErr(e instanceof ApiError ? e.message : "Failed to load leaderboard.");
                setRows([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const empty = useMemo(() => !loading && !err && rows.length === 0, [loading, err, rows.length]);

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <section
                className={cn(
                    "rounded-xl border border-border bg-card p-6 shadow-sm",
                    "ring-1 ring-inset ring-border"
                )}
            >
                <div className="text-xl font-semibold tracking-tight text-fg">Leaderboards</div>
                <div className="mt-1 text-sm text-muted-fg">Top 100 users by rating</div>

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
                    ) : empty ? (
                        <div className="text-sm text-muted-fg">No users yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs text-muted-fg">
                                    <tr className="border-b border-border">
                                        <th className="py-3 pr-3 font-medium">#</th>
                                        <th className="py-3 pr-3 font-medium">Avatar</th>
                                        <th className="py-3 pr-3 font-medium">Login</th>
                                        <th className="py-3 text-right font-medium">Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((u, idx) => (
                                        <tr
                                            key={u.login}
                                            className={cn(
                                                "border-b border-border/70 last:border-0",
                                                "cursor-pointer transition-[background-color,border-color] duration-150",
                                                "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)]"
                                            )}
                                            onClick={() => router.push(`/user/${encodeURIComponent(u.login)}`)}
                                        >
                                            <td className="py-3 pr-3 text-muted-fg">{idx + 1}</td>
                                            <td className="py-3 pr-3">
                                                <div
                                                    className={cn(
                                                        "flex h-9 w-9 items-center justify-center overflow-hidden rounded-full",
                                                        "border border-border bg-[hsl(var(--ring)/0.10)] text-fg",
                                                        "text-sm font-semibold"
                                                    )}
                                                    title={u.login}
                                                    aria-label="User avatar"
                                                >
                                                    {u.avatar_url ? (
                                                        <img
                                                            src={toAbsoluteUrl(u.avatar_url)}
                                                            alt={`${u.login} avatar`}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        initialLetter(u.login)
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-3 text-fg">{u.login}</td>
                                            <td className="py-3 text-right font-semibold text-fg">{u.total_xp}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
