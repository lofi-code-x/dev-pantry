"use client";

import React, {useEffect, useMemo, useState} from "react";
import {ApiError} from "@/lib/apiClient";
import {listModules, type Module} from "@/lib/api/modules";
import {useAuth} from "@/components/auth/AuthProvider";
import {ModuleCard} from "@/components/modules/ModuleCard";
import {ModulePrimaryAction} from "@/components/modules/ModulePrimaryAction";
import {listMyModuleProgress, type ModuleProgress} from "@/lib/api/me";
import {listModuleImagesBatch, type UploadView} from "@/lib/api/uploads";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export default function LearnPage() {
    const {user, ready} = useAuth();
    const onlyPublished = useMemo(() => !user, [user]);

    const [items, setItems] = useState<Module[]>([]);
    const [pending, setPending] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [progressMap, setProgressMap] = useState<Map<number, boolean>>(new Map());
    const [moduleImageMap, setModuleImageMap] = useState<Record<string, UploadView | null>>({});

    useEffect(() => {
        let cancelled = false;

        async function run() {
            setPending(true);
            setError(null);

            try {
                const [mods, prog] = await Promise.all([
                    listModules(),
                    user ? listMyModuleProgress() : Promise.resolve<ModuleProgress[]>([]),
                ]);

                if (cancelled) return;

                setItems(mods);

                const m = new Map<number, boolean>();
                for (const p of prog) m.set(p.module_id, Boolean(p.is_completed));
                setProgressMap(m);

                const ids = mods.map((x) => x.id);
                const imgMap = await listModuleImagesBatch(ids);

                if (cancelled) return;
                setModuleImageMap(imgMap);
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError) setError(e.message);
                else setError("Failed to load modules.");
                setItems([]);
                setProgressMap(new Map());
                setModuleImageMap({});
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

                <ModulePrimaryAction/>
            </header>

            <section
                className={cn(
                    "rounded-xl border border-border bg-card p-6 shadow-sm",
                    "ring-1 ring-inset ring-border"
                )}
            >
                {error ? (
                    <div
                        className={cn(
                            "mb-4 rounded-xl border p-3 text-sm text-fg",
                            "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                            "ring-1 ring-inset ring-ring/15"
                        )}
                    >
                        {error}
                    </div>
                ) : null}

                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-fg">Modules</div>
                    <div className="text-xs text-muted-fg">{pending ? "Loading..." : `${items.length} total`}</div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto overflow-x-hidden p-2 [scrollbar-gutter:stable]">
                    {pending ? (
                        <div className="text-sm text-muted-fg">Loading modules...</div>
                    ) : items.length === 0 ? (
                        <div className="text-sm text-muted-fg">No modules yet.</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {items.map((mod) => (
                                <ModuleCard
                                    key={mod.id}
                                    module={mod}
                                    completed={progressMap.get(mod.id) === true}
                                    imageUrl={moduleImageMap[String(mod.id)]?.url ?? null}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
}
