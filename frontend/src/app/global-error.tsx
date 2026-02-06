// src/app/global-error.tsx
"use client";

import React from "react";

export default function GlobalError({
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="ru">
            <body className="min-h-screen bg-bg text-fg antialiased font-sans">
                <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
                    <div className="w-full rounded-xl border border-border bg-card p-6 shadow-sm">
                        <h1 className="text-xl font-semibold tracking-tight text-fg">
                            Что-то пошло не так
                        </h1>
                        <p className="mt-2 text-sm text-muted-fg">
                            Попробуйте перезагрузить страницу.
                        </p>
                        <button type="button" className="btn mt-4" onClick={() => reset()}>
                            Перезагрузить
                        </button>
                    </div>
                </main>
            </body>
        </html>
    );
}
