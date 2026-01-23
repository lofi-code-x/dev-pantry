// src/components/auth/LoginForm.tsx
"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
import {useState} from "react";
import {loginApi} from "@/lib/api/auth";
import {ApiError} from "@/lib/apiClient";
import {useAuth} from "@/components/auth/AuthProvider";
import {saveSession} from "@/lib/authSession";

export function LoginForm() {
    const router = useRouter();

    const [login, setLogin] = useState("");
    const [password, setPassword] = useState("");

    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {setUser} = useAuth();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setPending(true);

        try {
            const auth = await loginApi({login, password});

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
        <main
            className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-5xl items-center justify-center px-4 py-10">
            <section className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <header className="mb-6">
                    <h1 className="text-xl font-semibold tracking-tight text-neutral-950">Log in</h1>
                    <p className="mt-2 text-sm text-neutral-600">
                        Use your credentials to access your account.
                    </p>
                </header>

                <form className="space-y-4" onSubmit={onSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-neutral-950">Login</label>
                        <input
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            autoComplete="username"
                            className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                            placeholder="user1"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-950">Password</label>
                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            autoComplete="current-password"
                            className="mt-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                            placeholder="••••••••"
                        />
                    </div>

                    {error ? (
                        <div
                            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
                            {error}
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={pending}
                        className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-neutral-200 bg-neutral-950 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    >
                        {pending ? "Logging in..." : "Log in"}
                    </button>
                </form>

                <footer className="mt-6 border-t border-neutral-200 pt-4">
                    <p className="text-center text-sm text-neutral-600">
                        Don&apos;t have an account?{" "}
                        <Link
                            href="/signup"
                            className="font-medium text-neutral-950 underline underline-offset-4 hover:text-neutral-700"
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
