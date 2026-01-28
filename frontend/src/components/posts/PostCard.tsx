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

export function PostCard({ post, isCompleted }: { post: Post; isCompleted?: boolean }) {
    const href = `/posts/${post.id}`;

    return (
        <Link
            href={href}
            className={cn(
                "block rounded-xl border border-border bg-card p-5 shadow-sm",
                "hover:bg-muted/50",
                "focus:outline-none focus:ring-2 focus:ring-ring"
            )}
            aria-label={`Open post: ${post.title}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                    <span className="rounded-md border border-border bg-card px-2 py-1">{post.category_tag}</span>
                    <span>•</span>
                    <span className="truncate">by {post.author}</span>
                    <span>•</span>
                    <span>updated {formatDate(post.updated_at)}</span>
                </div>

                {isCompleted ? (
                    <span
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-fg"
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
