// src/components/posts/UploadImagesPanel.tsx
"use client";

import React, { useRef, useState } from "react";
import { uploadImage } from "@/lib/api/uploads";
import { ApiError, toAbsoluteUrl } from "@/lib/apiClient";

import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

export type UploadedImage = {
    id: string; // uuid
    name: string; // filename or "image"
    url: string; // usually "/uploads/images/...."
};

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

const ringHover =
    "transition-[transform,background-color,border-color,box-shadow] duration-150 " +
    "hover:-translate-y-[1px] " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/30 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

export default function UploadImagesPanel({
                                              value,
                                              onChange,
                                              disabled,
                                              maxItems,
                                          }: {
    value: UploadedImage[];
    onChange: (next: UploadedImage[]) => void;
    disabled?: boolean;
    maxItems?: number; // module: 1, posts: undefined
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [pending, setPending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const limitReached = typeof maxItems === "number" && value.length >= maxItems;

    function openPicker() {
        if (disabled || pending || limitReached) return;
        inputRef.current?.click();
    }

    async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        e.target.value = "";
        if (!file) return;

        setErr(null);
        setPending(true);
        try {
            const res = await uploadImage(file);
            const img: UploadedImage = { id: res.id, name: file.name, url: res.url };

            const next = maxItems === 1 ? [img] : [img, ...value];
            onChange(next);
        } catch (e: any) {
            if (e instanceof ApiError) setErr(e.message);
            else setErr("Upload failed.");
        } finally {
            setPending(false);
        }
    }

    function remove(id: string) {
        onChange(value.filter((x) => x.id !== id));
    }

    async function copyMarkdown(url: string) {
        // ✅ в markdown кладём абсолютный URL, чтобы превью/рендер не пытались грузить с :3000
        const md = `![](${toAbsoluteUrl(url)})`;
        try {
            await navigator.clipboard.writeText(md);
        } catch {
            prompt("Copy markdown:", md);
        }
    }

    return (
        <div className="sm:col-span-3">
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />

            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={openPicker}
                    disabled={disabled || pending || limitReached}
                    className={cn("btn", ringHover, "disabled:cursor-not-allowed disabled:opacity-60")}
                >
                    <CloudUploadOutlinedIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                    {pending ? "Uploading..." : limitReached ? "Limit reached" : "Upload image"}
                </button>

                <span className="text-xs text-muted-fg">PNG/JPG/WebP, up to 10MB</span>
                {typeof maxItems === "number" ? (
                    <span className="text-xs text-muted-fg">
            ({value.length}/{maxItems})
          </span>
                ) : null}
            </div>

            {err ? (
                <div
                    className={cn(
                        "mt-3 rounded-lg border px-3 py-2 text-sm text-fg",
                        "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                        "ring-1 ring-inset ring-ring/15"
                    )}
                >
                    {err}
                </div>
            ) : null}

            {value.length ? (
                <div className="mt-4">
                    <div className="text-xs font-medium text-muted-fg">Images</div>

                    <ul className="mt-2 space-y-2">
                        {value.map((it) => (
                            <li
                                key={it.id}
                                className={cn(
                                    "card-gloss flex flex-wrap items-center gap-2 rounded-lg p-3",
                                    "ring-1 ring-inset ring-border"
                                )}
                            >
                                <span className="truncate text-sm text-fg">{it.name || "image"}</span>

                                <a
                                    href={toAbsoluteUrl(it.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={cn(
                                        "inline-flex items-center gap-1 text-xs underline underline-offset-4",
                                        "text-muted-fg hover:text-fg",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55 rounded"
                                    )}
                                >
                                    <OpenInNewIcon sx={{ fontSize: 16 }} className="text-muted-fg" />
                                    Open
                                </a>

                                <button
                                    type="button"
                                    onClick={() => copyMarkdown(it.url)}
                                    className={cn(
                                        "inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4",
                                        "text-fg hover:text-muted-fg",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55 rounded"
                                    )}
                                >
                                    <ContentCopyIcon sx={{ fontSize: 16 }} className="text-muted-fg" />
                                    Copy markdown
                                </button>

                                <button
                                    type="button"
                                    disabled={disabled || pending}
                                    onClick={() => remove(it.id)}
                                    className={cn(
                                        "ml-auto inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4",
                                        "text-muted-fg hover:text-fg",
                                        "disabled:cursor-not-allowed disabled:opacity-60",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55 rounded"
                                    )}
                                    title="Remove"
                                >
                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} className="text-muted-fg" />
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-2 text-xs text-muted-fg">Removing here changes bindings on save.</div>
                </div>
            ) : null}
        </div>
    );
}
