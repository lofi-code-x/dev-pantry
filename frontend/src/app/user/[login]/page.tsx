// src/app/user/[login]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError, toAbsoluteUrl } from "@/lib/apiClient";
import { getPublicUserProfile, type PublicUserProfile } from "@/lib/api/user";

import LinkIcon from "@mui/icons-material/Link";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function initialLetter(login: string) {
    return (login.trim()[0] ?? "?").toUpperCase();
}

export default function PublicUserPage() {
    const params = useParams<{ login?: string }>();
    const login = useMemo(() => (params?.login ? String(params.login) : "").trim(), [params?.login]);

    const [profile, setProfile] = useState<PublicUserProfile | null>(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!login) return;

        let cancelled = false;

        async function load() {
            setErr(null);
            setLoading(true);
            try {
                const res = await getPublicUserProfile(login);
                if (!cancelled) setProfile(res);
            } catch (e) {
                if (cancelled) return;
                setErr(e instanceof ApiError ? e.message : "Failed to load user profile.");
                setProfile(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [login]);

    const avatarLetter = useMemo(() => (profile ? initialLetter(profile.login) : "?"), [profile]);

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <section
                className={cn(
                    "rounded-xl border border-border bg-card p-6 shadow-sm",
                    "ring-1 ring-inset ring-border"
                )}
            >
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
                    <div className={cn("surface p-6", "ring-1 ring-inset ring-border")}>
                        <div className="text-sm text-muted-fg">Loading…</div>
                    </div>
                ) : profile ? (
                    <>
                        <div className="grid gap-6 lg:grid-cols-12">
                            <div className="lg:col-span-8">
                                <div className="flex items-start gap-4">
                                    <div className="flex flex-col items-start gap-2">
                                        <div
                                            className={cn(
                                                "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full",
                                                "border border-border bg-[hsl(var(--ring)/0.10)] text-fg",
                                                "text-lg font-semibold",
                                                "ring-1 ring-inset ring-ring/15"
                                            )}
                                            aria-label="User avatar"
                                            title={profile.login}
                                        >
                                            {profile.avatar_url ? (
                                                <img
                                                    src={toAbsoluteUrl(profile.avatar_url)}
                                                    alt={`${profile.login} avatar`}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                avatarLetter
                                            )}
                                        </div>
                                    </div>

                                    <div className="min-w-0">
                                        <div className="truncate text-xl font-semibold tracking-tight text-fg">
                                            {profile.login}
                                        </div>
                                        <div className="mt-1 text-sm text-muted-fg">
                                            Role: <span className="text-fg">{profile.role}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-12 lg:items-stretch">
                            <div className="lg:col-span-8">
                                <div className={cn("surface p-4", "ring-1 ring-inset ring-border")}>
                                    <div className="text-sm font-medium text-fg">Contacts</div>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <div className="text-xs text-muted-fg">Email</div>
                                            <div className="mt-1 text-sm text-fg">
                                                {profile.contacts.email ?? "—"}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-muted-fg">Website</div>
                                            <div className="mt-1 flex items-center gap-2 text-sm text-fg">
                                                <LinkIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                                {profile.contacts.website ?? "—"}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-muted-fg">GitHub</div>
                                            <div className="mt-1 flex items-center gap-2 text-sm text-fg">
                                                <LinkIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                                {profile.contacts.github ?? "—"}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-xs text-muted-fg">Telegram</div>
                                            <div className="mt-1 flex items-center gap-2 text-sm text-fg">
                                                <LinkIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                                {profile.contacts.telegram ?? "—"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-4">
                                <div
                                    className={cn(
                                        "surface p-4",
                                        "ring-1 ring-inset ring-border",
                                        "h-full",
                                        "flex flex-col items-center justify-center text-center"
                                    )}
                                >
                                    <div className="text-sm font-medium text-fg">User rating</div>
                                    <div className="mt-2 text-3xl font-semibold text-fg">
                                        {profile.stats.total_xp}
                                    </div>
                                    <div className="mt-1 text-xs text-muted-fg">
                                        {profile.stats.posts_completed} posts • {profile.stats.modules_completed} modules
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className={cn("surface p-6", "ring-1 ring-inset ring-border")}>
                        <div className="text-sm text-muted-fg">User not found.</div>
                    </div>
                )}
            </section>
        </main>
    );
}
