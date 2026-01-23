// src/components/posts/MdPreview.tsx
"use client";

import dynamic from "next/dynamic";
import React from "react";

// Берём только Markdown-рендерер из той же библиотеки
const Markdown = dynamic(
    () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
    { ssr: false }
);

export default function MdPreview({ source }: { source: string }) {
    return (
        <div data-color-mode="light" className="prose max-w-none">
            <Markdown source={source} style={{ whiteSpace: "pre-wrap" }} />
        </div>
    );
}
