// src/app/posts/[id]/not-found.tsx
import Link from "next/link";

export default function PostNotFound() {
    return (
        <main className="mx-auto w-full max-w-3xl px-6 py-16">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h1 className="text-xl font-semibold tracking-tight text-fg">Пост не найден</h1>
                <p className="mt-2 text-sm text-muted-fg">
                    Возможно, он был удален или у вас нет доступа.
                </p>
                <Link href="/posts" className="btn mt-4">
                    К каталогу постов
                </Link>
            </div>
        </main>
    );
}
