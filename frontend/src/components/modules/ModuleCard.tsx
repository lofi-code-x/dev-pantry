// src/components/modules/ModuleCard.tsx
"use client";

import Link from "next/link";
import type { Module } from "@/lib/api/modules";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import { toAbsoluteUrl } from "@/lib/apiClient";

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

export function ModuleCard({
                               module,
                               completed,
                               imageUrl,
                           }: {
    module: Module;
    completed?: boolean;
    imageUrl?: string | null;
}) {
    const href = `/learn/${module.id}`;

    // ✅ абсолютный URL, чтобы не ходило на localhost:3000/uploads/...
    const abs = imageUrl ? toAbsoluteUrl(imageUrl) : "";

    return (
        <Link
            href={href}
            className={cn(
                "block card-gloss p-5",
                "ring-1 ring-inset ring-border",
                "transition-[transform,background-color,border-color,box-shadow] duration-150",
                "hover:-translate-y-[1px]",
                "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)]",
                "hover:ring-2 hover:ring-inset hover:ring-ring/35",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55"
            )}
            aria-label={`Open module: ${module.title}`}
        >
            <div className="flex items-start gap-4">
                {/* left image */}
                <div
                    className={cn(
                        "shrink-0 overflow-hidden rounded-xl",
                        "ring-1 ring-inset ring-border",
                        "bg-[hsl(var(--ring)/0.06)]"
                    )}
                    style={{ width: 96, height: 96 }}
                >
                    {abs ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={abs} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <ImageOutlinedIcon sx={{ fontSize: 26 }} className="text-muted-fg" />
                        </div>
                    )}
                </div>

                {/* right content */}
                <div className="min-w-0 flex-1">
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
                            <span
                                className={cn(
                                    "shrink-0 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
                                    "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.10)] text-fg",
                                    "ring-1 ring-inset ring-ring/15"
                                )}
                                title="Completed"
                            >
                <TaskAltIcon sx={{ fontSize: 16 }} className="text-muted-fg" />
                Completed
              </span>
                        ) : null}
                    </div>

                    <div className="mt-3 text-xs text-muted-fg">
                        by {module.author} • updated {formatDate(module.updated_at)}
                        {module.is_published ? "" : " • private"}
                    </div>
                </div>
            </div>
        </Link>
    );
}
