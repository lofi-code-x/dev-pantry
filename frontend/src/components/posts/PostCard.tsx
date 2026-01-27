// src/components/posts/PostCard.tsx
"use client";

import Link from "next/link";
import type {Post} from "@/lib/api/posts";

// ✅ MUI icon
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

export function PostCard({
                             post,
                             isCompleted,
                         }: {
    post: Post;
    isCompleted?: boolean;
}) {
    const href = `/posts/${post.id}`;

    return (
        <Link
            href={href}
            className={cn(
                "block rounded-xl border border-neutral-200 bg-white p-5 shadow-sm",
                "hover:bg-neutral-50/50",
                "focus:outline-none focus:ring-2 focus:ring-neutral-200"
            )}
            aria-label={`Open post: ${post.title}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
          <span className="rounded-md border border-neutral-200 bg-white px-2 py-1">
            {post.category_tag}
          </span>
                    <span>•</span>
                    <span className="truncate">by {post.author}</span>
                    <span>•</span>
                    <span>updated {formatDate(post.updated_at)}</span>
                </div>

                {isCompleted ? (
                    <span
                        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700"
                        title="Completed"
                    >
            <CheckCircleOutlineIcon sx={{fontSize: 18}} className="text-neutral-900"/>
            <span>done</span>
          </span>
                ) : null}
            </div>

            <h3 className="mt-3 text-lg font-semibold tracking-tight text-neutral-950">{post.title}</h3>

            {post.preview_text ? (
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">{post.preview_text}</p>
            ) : (
                <p className="mt-2 text-sm text-neutral-600">No preview.</p>
            )}
        </Link>
    );
}
