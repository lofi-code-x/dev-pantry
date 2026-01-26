"use client";

import Link from "next/link";
import type { Module } from "@/lib/api/modules";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

export function ModuleCard({ module, completed }: { module: Module; completed?: boolean }) {
    const href = `/learn/${module.id}`;

    return (
        <Link
            href={href}
            className={cn(
                "block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm",
                "hover:bg-neutral-50/50",
                "focus:outline-none focus:ring-2 focus:ring-neutral-200"
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold tracking-tight text-neutral-950">
                        {module.title}
                    </h3>

                    {module.description ? (
                        <p className="mt-2 line-clamp-3 text-sm text-neutral-700">
                            {module.description}
                        </p>
                    ) : (
                        <p className="mt-2 text-sm text-neutral-600">No description.</p>
                    )}
                </div>

                {completed ? (
                    <span className="shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-800">
            Completed
          </span>
                ) : null}
            </div>

            <div className="mt-3 text-xs text-neutral-600">
                by {module.author} • updated{" "}
                {new Date(module.updated_at).toLocaleDateString("ru-RU", {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                })}
                {module.is_published ? "" : " • private"}
            </div>
        </Link>
    );
}
