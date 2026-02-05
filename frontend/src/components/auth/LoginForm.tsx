// src/components/auth/LoginForm.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/apiClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { saveSession } from "@/lib/authSession";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function LoginForm() {
    const router = useRouter();

    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");

    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { setUser } = useAuth();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setPending(true);

        try {
            const auth = await loginApi({ login, password });

            // 1) persist token + normalized user into localStorage
            saveSession(auth);

            // 2) update in-memory auth state immediately (navbar etc.)
            setUser(auth.user);

            router.push("/posts");
            router.refresh();
        } catch (err) {
            if (err instanceof ApiError) setError(err.message);
            else setError("Login failed.");
        } finally {
            setPending(false);
        }
    }

    return (
        <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-5xl items-center justify-center px-4 py-10">
            <section className={cn("w-full max-w-md card-gloss p-6", "ring-1 ring-inset ring-border")}>
                <header className="mb-6">
                    <h1 className="text-xl font-semibold tracking-tight text-fg">Log in</h1>
                    <p className="mt-2 text-sm text-muted-fg">Use your credentials to access your account.</p>
                </header>

                <form className="space-y-4" onSubmit={onSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-fg">Login</label>
                        <input
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            autoComplete="username"
                            className="input mt-2"
                            placeholder="user1"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-fg">Password</label>
                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            autoComplete="current-password"
                            className="input mt-2"
                            placeholder="••••••••"
                        />
                    </div>

                    {error ? (
                        <div
                            className={cn(
                                "rounded-xl border p-3 text-sm text-fg",
                                "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                                "ring-1 ring-inset ring-ring/15"
                            )}
                        >
                            {error}
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={pending}
                        className={cn("btn w-full", "disabled:cursor-not-allowed disabled:opacity-60")}
                    >
                        {pending ? "Logging in..." : "Log in"}
                    </button>
                </form>

                <footer className="mt-6 border-t border-border pt-4">
                    <p className="text-center text-sm text-muted-fg">
                        Don&apos;t have an account?{" "}
                        <Link
                            href="/signup"
                            className="font-medium text-fg underline underline-offset-4 hover:text-[hsl(var(--ring))]"
                        >
                            Sign up
                        </Link>
                        .
                    </p>
                </footer>
            </section>
        </main>
    );
}
