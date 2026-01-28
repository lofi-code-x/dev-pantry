"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/apiClient";
import { listModules, type Module } from "@/lib/api/modules";
import { useAuth } from "@/components/auth/AuthProvider";
import { ModuleCard } from "@/components/modules/ModuleCard";
import { ModulePrimaryAction } from "@/components/modules/ModulePrimaryAction";
import { listMyModuleProgress, type ModuleProgress } from "@/lib/api/me";

export default function LearnPage() {
    const { user, ready } = useAuth();

    const onlyPublished = useMemo(() => !user, [user]);

    const [items, setItems] = useState<Module[]>([]);
    const [pending, setPending] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [progressMap, setProgressMap] = useState<Map<number, boolean>>(new Map());

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setPending(true);
            setError(null);

            try {
                const [mods, prog] = await Promise.all([
                    listModules({ only_published: onlyPublished }),
                    user ? listMyModuleProgress() : Promise.resolve<ModuleProgress[]>([]),
                ]);

                if (cancelled) return;

                setItems(mods);

                const m = new Map<number, boolean>();
                for (const p of prog) m.set(p.module_id, Boolean(p.is_completed));
                setProgressMap(m);
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError) setError(e.message);
                else setError("Failed to load modules.");
                setItems([]);
                setProgressMap(new Map());
            } finally {
                if (!cancelled) setPending(false);
            }
        }

        if (!ready) return;
        run();

        return () => {
            cancelled = true;
        };
    }, [onlyPublished, user, ready]);

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-fg">Learn</h1>
                    <p className="mt-2 text-sm text-muted-fg">Модули обучения и подборки.</p>
                </div>

                <ModulePrimaryAction />
            </header>

            <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
                {error ? (
                    <div className="mb-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-fg">
                        {error}
                    </div>
                ) : null}

                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-fg">Modules</div>
                    <div className="text-xs text-muted-fg">
                        {pending ? "Loading..." : `${items.length} total`}
                    </div>
                </div>

                <div className="max-h-[70vh] overflow-auto pr-1">
                    {pending ? (
                        <div className="text-sm text-muted-fg">Loading modules...</div>
                    ) : items.length === 0 ? (
                        <div className="text-sm text-muted-fg">No modules yet.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {items.map((m) => (
                                <ModuleCard key={m.id} module={m} completed={progressMap.get(m.id) === true} />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
