// src/app/learn/page.tsx
export default function LearnPage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Learn</h1>
                <p className="mt-2 text-sm text-neutral-600">
                    Модули обучения и подборки.
                </p>
            </header>

            <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-neutral-600">
                    Здесь будет список модулей (карточки), фильтры и прогресс.
                </p>
            </section>
        </main>
    );
}
