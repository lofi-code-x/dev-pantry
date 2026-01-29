// src/components/posts/MdEditor.tsx
"use client";

import dynamic from "next/dynamic";
import React from "react";

const MDEditor = dynamic(
    () => import("@uiw/react-md-editor"),
    {ssr: false}
);

export default function MdEditor({
                                     value,
                                     onChange,
                                 }: {
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <MDEditor
            value={value}
            height={800}
            onChange={(v) => onChange(v ?? "")}
        />
    );
}
