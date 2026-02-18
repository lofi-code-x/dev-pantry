// src/app/page.tsx
import React from "react";
import Link from "next/link";

import MenuBookIcon from "@mui/icons-material/MenuBook";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import BoltIcon from "@mui/icons-material/Bolt";

import {getVersion} from "@/lib/api/meta";

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

const cardHover =
    "transition-[background-color,border-color,box-shadow] duration-150 " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/30 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

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
        <Link
            href={href}
            className={cn("block rounded-2xl border border-border bg-card p-5 shadow-sm", cardHover)}
            aria-label={title}
        >
            <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl border border-border bg-bg p-2 text-fg/90">{icon}</div>

                <div className="min-w-0">
                    <h3 className="text-base font-semibold text-fg">{title}</h3>
                    <p className="mt-1 text-sm text-muted-fg">{desc}</p>

                    <div
                        className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-fg underline underline-offset-4">
                        {cta}
                        <span aria-hidden="true">→</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

export default async function HomePage() {
    let ver: string | null;

    try {
        const v = await getVersion();
        ver = v?.version ? `v${v.version}` : null;
    } catch {
        ver = null;
    }

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            {/* HERO */}
            <section className={cn("card-gloss p-7 md:p-10", "ring-1 ring-inset ring-border")}>
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                        <div className="flex flex-wrap gap-2">
                            <Pill>IT</Pill>
                            <Pill>Посты</Pill>
                            <Pill>Модули</Pill>
                            <Pill>Прогресс</Pill>
                            <Pill>Лидерборд</Pill>
                        </div>

                        <h1 className="mt-4 flex flex-wrap items-center gap-3 text-3xl font-semibold tracking-tight text-fg md:text-4xl">
                            <span>Quest Lab</span>

                            <span
                                className="inline-flex items-center rounded-full border border-border bg-[hsl(var(--ring)/0.10)] px-2.5 py-1 text-xs font-semibold text-fg">
                ALPHA
              </span>

                            {ver ? (
                                <span
                                    className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-fg">
                  {ver}
                </span>
                            ) : null}
                        </h1>

                        <p className="mt-2 text-sm text-muted-fg">
                            Экспериментальная версия: интерфейс и функции активно меняются, возможны баги.
                        </p>

                        <p className="mt-3 text-sm leading-6 text-muted-fg md:text-base">
                            Quest Lab — экспериментальная платформа для изучения IT через модули. Проходи темы шаг за
                            шагом, отмечай завершённое и соревнуйся в таблице лидеров.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link href="/posts" className="btn">
                                Открыть Explore
                            </Link>

                            <Link
                                href="/learn"
                                className={cn("btn", "border-transparent bg-primary text-primary-fg hover:bg-primary/90")}
                            >
                                Начать обучение
                            </Link>

                            <Link href="/me" className="btn">
                                Профиль / Прогресс
                            </Link>
                        </div>
                    </div>

                    <div className="grid w-full gap-3 md:w-90">
                        <div className={cn("surface p-4", "ring-1 ring-inset ring-border")}>
                            <div className="text-xs font-medium text-muted-fg">Фокус</div>
                            <div className="mt-1 text-sm font-semibold text-fg">Быстро найти нужную тему по IT</div>
                            <p className="mt-1 text-xs leading-5 text-muted-fg">
                                Категории + поиск + удобная лента постов.
                            </p>
                        </div>

                        <div className={cn("surface p-4", "ring-1 ring-inset ring-border")}>
                            <div className="text-xs font-medium text-muted-fg">Обучение</div>
                            <div className="mt-1 text-sm font-semibold text-fg">Учиться по модулям с прогрессом</div>
                            <p className="mt-1 text-xs leading-5 text-muted-fg">
                                Подборки постов, чекпоинты и завершение модулей.
                            </p>
                        </div>

                        <div className={cn("surface p-4", "ring-1 ring-inset ring-border")}>
                            <div className="text-xs font-medium text-muted-fg">Соревнование</div>
                            <div className="mt-1 text-sm font-semibold text-fg">Расти в таблице лидеров</div>
                            <p className="mt-1 text-xs leading-5 text-muted-fg">
                                Зарабатывай очки за прогресс и сравнивай результаты.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mt-8">
                <h2 className="text-base font-semibold text-fg">Что ты можешь сделать прямо сейчас</h2>
                <p className="mt-1 text-sm text-muted-fg">Выбери сценарий — чтение, обучение или контроль прогресса.</p>

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

            <section className={cn("mt-8 surface p-6", "ring-1 ring-inset ring-border")}>
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
                    <li className="flex gap-2">
            <span
                className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-border bg-bg text-xs font-semibold text-fg">
              4
            </span>
                        <span>
              Поднимайся в <span className="text-fg">лидерборде</span> — очки растут вместе с твоим прогрессом.
            </span>
                    </li>
                </ol>
            </section>

            <footer className="mt-10 text-center text-xs text-muted-fg">
                Quest Lab — experimental IT learning platform.
            </footer>
        </main>
    );
}
