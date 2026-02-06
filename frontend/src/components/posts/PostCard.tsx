// src/components/posts/PostCard.tsx
"use client";

import Link from "next/link";
import type { Post } from "@/lib/api/posts";

// ✅ Google (MUI) icon
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

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

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

const ringHover =
    "transition-[transform,background-color,border-color,box-shadow] duration-150 " +
    "hover:-translate-y-[1px] " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/30 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

export function PostCard({ post, isCompleted }: { post: Post; isCompleted?: boolean }) {
    const href = `/posts/${post.id}`;

    return (
        <Link
            href={href}
            className={cn(
                "block card-gloss p-5",
                "ring-1 ring-inset ring-border",
                ringHover
            )}
            aria-label={`Open post: ${post.title}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-fg">
          <span className="rounded-md border border-border bg-[hsl(var(--ring)/0.08)] px-2 py-1">
            {post.category_tag}
          </span>
                    {!post.is_published ? (
                        <span className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-red-600">
                            private
                        </span>
                    ) : null}
                    <span>•</span>
                    <span className="truncate">by {post.author}</span>
                    <span>•</span>
                    <span>updated {formatDate(post.updated_at)}</span>
                </div>

                {isCompleted ? (
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                            "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.10)] text-fg",
                            "ring-1 ring-inset ring-ring/15"
                        )}
                        title="Completed"
                    >
            <CheckCircleOutlineIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
            <span>done</span>
          </span>
                ) : null}
            </div>

            <h3 className="mt-3 text-lg font-semibold tracking-tight text-fg">{post.title}</h3>

            {post.preview_text ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-fg">{post.preview_text}</p>
            ) : (
                <p className="mt-2 text-sm text-muted-fg">No preview.</p>
            )}
        </Link>
    );
}
