// src/components/AnalyticsTracker.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { apiFetchAuthed } from "@/lib/authedFetch";

export function AnalyticsTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname) return;
        if (pathname.startsWith("/admin")) return;

        const body = JSON.stringify({ path: pathname });
        apiFetchAuthed<void>("/api/track/pageview", {
            method: "POST",
            body,
        }).catch(() => {});
    }, [pathname]);

    return null;
}
