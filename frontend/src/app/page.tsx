// src/app/page.tsx
import Link from "next/link";

import MenuBookIcon from "@mui/icons-material/MenuBook";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import BoltIcon from "@mui/icons-material/Bolt";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function Pill({children}: { children: React.ReactNode }) {
    return (
        <span
            className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-fg">
      {children}
    </span>
    );
}

function FeatureCard({
                         title,
                         desc,
                         href,
                         cta,
                         icon,
                     }: {
    title: string;
    desc: string;
    href: string;
    cta: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-border bg-bg p-2 text-fg/90">
                    {icon}
                </div>

                <div className="min-w-0">
                    <h3 className="text-base font-semibold text-fg">{title}</h3>
                    <p className="mt-1 text-sm text-muted-fg">{desc}</p>

                    <div className="mt-3">
                        <Link
                            href={href}
                            className="inline-flex items-center gap-2 text-sm font-medium text-fg underline-offset-4 hover:underline"
                        >
                            {cta}
                            <span aria-hidden="true" className="transition group-hover:translate-x-0.5">
                →
              </span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function HomePage() {
    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            {/* HERO */}
            <section className="rounded-3xl border border-border bg-card p-7 shadow-sm md:p-10">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                        <div className="flex flex-wrap gap-2">
                            <Pill>Посты</Pill>
                            <Pill>Модули</Pill>
                            <Pill>Прогресс</Pill>
                            <Pill>Закладки</Pill>
                        </div>

                        <h1 className="mt-4 flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight text-fg md:text-4xl">
                            <span>StackForge</span>

                            <span className="inline-flex items-center rounded-full border border-border bg-bg px-2.5 py-1 text-xs font-semibold text-fg">
    ALPHA
  </span>
                        </h1>

                        <p className="mt-2 text-sm text-muted-fg">
                            Ранняя версия: интерфейс и функции активно меняются, возможны баги.
                        </p>

                        <p className="mt-3 text-sm leading-6 text-muted-fg md:text-base">
                            Кузница инженерных знаний: читай посты, собирай модули и отмечай прогресс.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href="/posts"
                                className={cn(
                                    "inline-flex items-center justify-center rounded-xl border border-border",
                                    "bg-bg px-4 py-2 text-sm font-medium text-fg shadow-sm",
                                    "hover:bg-card transition"
                                )}
                            >
                                Открыть Explore
                            </Link>

                            <Link
                                href="/learn"
                                className={cn(
                                    "inline-flex items-center justify-center rounded-xl",
                                    "bg-fg px-4 py-2 text-sm font-semibold text-bg shadow-sm",
                                    "hover:opacity-90 transition"
                                )}
                            >
                                Начать обучение
                            </Link>

                            <Link
                                href="/me"
                                className={cn(
                                    "inline-flex items-center justify-center rounded-xl border border-border",
                                    "bg-card px-4 py-2 text-sm font-medium text-fg",
                                    "hover:bg-bg transition"
                                )}
                            >
                                Профиль / Прогресс
                            </Link>
                        </div>
                    </div>

                    {/* Right-side “cards” */}
                    <div className="grid w-full gap-3 md:w-[360px]">
                        <div className="rounded-2xl border border-border bg-bg p-4">
                            <div className="text-xs font-medium text-muted-fg">Фокус</div>
                            <div className="mt-1 text-sm font-semibold text-fg">
                                Быстро найти нужную тему
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted-fg">
                                Категории + поиск + удобная лента постов.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-border bg-bg p-4">
                            <div className="text-xs font-medium text-muted-fg">Обучение</div>
                            <div className="mt-1 text-sm font-semibold text-fg">
                                Учиться по модулям
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted-fg">
                                Подборки постов с прогрессом и завершением.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="mt-8">
                <h2 className="text-base font-semibold text-fg">Что ты можешь сделать прямо сейчас</h2>
                <p className="mt-1 text-sm text-muted-fg">
                    Выбери сценарий — чтение, обучение или контроль прогресса.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <FeatureCard
                        title="Explore"
                        desc="Лента постов, категории и поиск по базе."
                        href="/posts"
                        cta="Перейти к постам"
                        icon={<TravelExploreIcon fontSize="small"/>}
                    />
                    <FeatureCard
                        title="Learn"
                        desc="Модули обучения: подборки постов с прогрессом."
                        href="/learn"
                        cta="Открыть модули"
                        icon={<MenuBookIcon fontSize="small"/>}
                    />
                    <FeatureCard
                        title="Progress"
                        desc="Твои закладки, прочитанное и завершённые модули."
                        href="/me"
                        cta="Посмотреть профиль"
                        icon={<BoltIcon fontSize="small"/>}
                    />
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="text-base font-semibold text-fg">Как это работает</h2>

                <ol className="mt-3 space-y-2 text-sm text-muted-fg">
                    <li className="flex gap-2">
            <span
                className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-bg text-xs font-semibold text-fg">
              1
            </span>
                        <span>
              Найди тему в <span className="text-fg">Explore</span> — через категории или поиск.
            </span>
                    </li>
                    <li className="flex gap-2">
            <span
                className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-bg text-xs font-semibold text-fg">
              2
            </span>
                        <span>
              Открой <span className="text-fg">Learn</span> и проходи модули — отмечай посты как завершённые.
            </span>
                    </li>
                    <li className="flex gap-2">
            <span
                className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-bg text-xs font-semibold text-fg">
              3
            </span>
                        <span>
              В <span className="text-fg">/me</span> смотри прогресс, закладки и завершённые модули.
            </span>
                    </li>
                </ol>
            </section>

            <footer className="mt-10 text-center text-xs text-muted-fg">
                StackForge — knowledge & learning hub для разработчиков.
            </footer>
        </main>
    );
}
