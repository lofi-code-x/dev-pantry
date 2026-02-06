// src/app/me/error.tsx
"use client";

import React from "react";

export default function MeError({
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <main className="mx-auto w-full max-w-3xl px-6 py-16">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h1 className="text-xl font-semibold tracking-tight text-fg">
                    Не удалось загрузить профиль
                </h1>
                <p className="mt-2 text-sm text-muted-fg">
                    Попробуйте повторить попытку.
                </p>
                <button type="button" className="btn mt-4" onClick={() => reset()}>
                    Повторить
                </button>
            </div>
        </main>
    );
}
