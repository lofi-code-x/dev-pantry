// src/components/posts/UploadImagesPanel.tsx
"use client";

import React, { useRef, useState } from "react";
import { uploadImage } from "@/lib/api/uploads";
import { ApiError } from "@/lib/apiClient";

import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

type UploadedImage = {
    name: string;
    url: string; // то, что вернул сервер
};

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function toAbsolute(url: string) {
    const u = String(url ?? "").trim();
    if (!u) return u;
    if (u.startsWith("http://") || u.startsWith("https://")) return u;
    if (u.startsWith("/")) return `${API_BASE}${u}`;
    return `${API_BASE}/${u}`;
}

const ringHover =
    "transition-[transform,background-color,border-color,box-shadow] duration-150 " +
    "hover:-translate-y-[1px] " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/30 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

export default function UploadImagesPanel({
                                              onUploaded,
                                              disabled,
                                          }: {
    onUploaded?: (img: UploadedImage) => void;
    disabled?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [items, setItems] = useState<UploadedImage[]>([]);
    const [pending, setPending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    function openPicker() {
        if (disabled || pending) return;
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

            const img: UploadedImage = {
                name: file.name,
                url: res.url,
            };

            setItems((prev) => [img, ...prev]);
            onUploaded?.(img);
        } catch (e: any) {
            if (e instanceof ApiError) setErr(e.message);
            else setErr("Upload failed.");
        } finally {
            setPending(false);
        }
    }

    async function copyMarkdown(url: string) {
        const md = `![](${toAbsolute(url)})`;
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
                    disabled={disabled || pending}
                    className={cn("btn", ringHover, "disabled:cursor-not-allowed disabled:opacity-60")}
                >
                    <CloudUploadOutlinedIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                    {pending ? "Uploading..." : "Upload image"}
                </button>

                <span className="text-xs text-muted-fg">PNG/JPG/WebP, up to 10MB</span>
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

            {items.length ? (
                <div className="mt-4">
                    <div className="text-xs font-medium text-muted-fg">Uploaded images</div>

                    <ul className="mt-2 space-y-2">
                        {items.map((it, idx) => (
                            <li
                                key={`${it.url}-${idx}`}
                                className={cn(
                                    "card-gloss flex flex-wrap items-center gap-2 rounded-lg p-3",
                                    "ring-1 ring-inset ring-border"
                                )}
                            >
                                <span className="truncate text-sm text-fg">{it.name}</span>

                                <a
                                    href={toAbsolute(it.url)}
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
                                        "ml-auto inline-flex items-center gap-1 text-xs font-medium underline underline-offset-4",
                                        "text-fg hover:text-muted-fg",
                                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55 rounded"
                                    )}
                                >
                                    <ContentCopyIcon sx={{ fontSize: 16 }} className="text-muted-fg" />
                                    Copy markdown
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-2 text-xs text-muted-fg">Tip: paste copied markdown into your content.</div>
                </div>
            ) : null}
        </div>
    );
}
