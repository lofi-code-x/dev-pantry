// src/app/page.tsx
export default function HomePage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-8">
                <h1 className="text-3xl font-semibold tracking-tight text-fg">Dev-Pantry</h1>
                <p className="mt-2 text-sm text-muted-fg">
                    Кладовая знаний о разработке: посты, категории и модули обучения.
                </p>
            </header>

            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-base font-semibold text-fg">Что внутри</h2>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-fg">
                    <li>Explore — лента постов и поиск по базе.</li>
                    <li>Learn — модули обучения, подборки и прогресс.</li>
                    <li>LogIn — авторизация и личные данные.</li>
                </ul>
            </section>
        </main>
    );
}
