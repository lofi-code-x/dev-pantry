// src/components/modules/ModuleCard.tsx
"use client";

import Link from "next/link";
import type { Module } from "@/lib/api/modules";

// ✅ Google (MUI) icon
import TaskAltIcon from "@mui/icons-material/TaskAlt";

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function formatDate(iso: string) {
    try {
        return new Date(iso).toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
    } catch {
        return iso;
    }
}

export function ModuleCard({ module, completed }: { module: Module; completed?: boolean }) {
    const href = `/learn/${module.id}`;

    return (
        <Link
            href={href}
            className={cn(
                "block rounded-xl border border-border bg-card p-5 shadow-sm",
                "hover:bg-muted/50",
                "focus:outline-none focus:ring-2 focus:ring-ring"
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold tracking-tight text-fg">{module.title}</h3>

                    {module.description ? (
                        <p className="mt-2 line-clamp-3 text-sm text-muted-fg">{module.description}</p>
                    ) : (
                        <p className="mt-2 text-sm text-muted-fg">No description.</p>
                    )}
                </div>

                {completed ? (
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-fg">
            <TaskAltIcon sx={{ fontSize: 16 }} className="text-muted-fg" />
            Completed
          </span>
                ) : null}
            </div>

            <div className="mt-3 text-xs text-muted-fg">
                by {module.author} • updated {formatDate(module.updated_at)}
                {module.is_published ? "" : " • private"}
            </div>
        </Link>
    );
}
