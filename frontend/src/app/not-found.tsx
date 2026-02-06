// src/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
    return (
        <main className="mx-auto w-full max-w-3xl px-6 py-16">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h1 className="text-xl font-semibold tracking-tight text-fg">Страница не найдена</h1>
                <p className="mt-2 text-sm text-muted-fg">
                    Такой страницы нет или она была удалена.
                </p>
                <Link href="/" className="btn mt-4">
                    На главную
                </Link>
            </div>
        </main>
    );
}
