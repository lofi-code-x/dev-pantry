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
    url: string; // то, что вернул сервер (часто это "/uploads/images/..." или "uploads/images/...")
};

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function toAbsolute(url: string) {
    const u = String(url ?? "").trim();
    if (!u) return u;

    // уже абсолютный URL
    if (u.startsWith("http://") || u.startsWith("https://")) return u;

    // путь от корня (например "/uploads/images/..")
    if (u.startsWith("/")) return `${API_BASE}${u}`;

    // относительный путь (например "uploads/images/..")
    return `${API_BASE}/${u}`;
}

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
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPick}
            />

            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={openPicker}
                    disabled={disabled || pending}
                    className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium",
                        "text-neutral-950 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-200",
                        "disabled:cursor-not-allowed disabled:opacity-60"
                    )}
                >
                    <CloudUploadOutlinedIcon sx={{ fontSize: 18 }} className="text-neutral-700" />
                    {pending ? "Uploading..." : "Upload image"}
                </button>

                <span className="text-xs text-neutral-600">PNG/JPG/WebP, up to 10MB</span>
            </div>

            {err ? (
                <div className="mt-2 text-sm text-neutral-800">
          <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1">
            {err}
          </span>
                </div>
            ) : null}

            {items.length ? (
                <div className="mt-3">
                    <div className="text-xs font-medium text-neutral-700">Uploaded images</div>

                    <ul className="mt-2 space-y-2">
                        {items.map((it, idx) => (
                            <li
                                key={`${it.url}-${idx}`}
                                className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2"
                            >
                                <span className="text-sm text-neutral-950">{it.name}</span>

                                <a
                                    href={toAbsolute(it.url)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-neutral-700 underline underline-offset-4 hover:text-neutral-950"
                                >
                                    <OpenInNewIcon sx={{ fontSize: 16 }} className="text-neutral-600" />
                                    Open
                                </a>

                                <button
                                    type="button"
                                    onClick={() => copyMarkdown(it.url)}
                                    className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-neutral-950 underline underline-offset-4 hover:text-neutral-700"
                                >
                                    <ContentCopyIcon sx={{ fontSize: 16 }} className="text-neutral-600" />
                                    Copy markdown
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-2 text-xs text-neutral-600">
                        Tip: paste copied markdown into your content.
                    </div>
                </div>
            ) : null}
        </div>
    );
}
