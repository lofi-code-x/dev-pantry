"use client";

import {useEffect, useRef} from "react";
import {usePathname} from "next/navigation";
import {apiFetchAuthed} from "@/lib/authedFetch";

export function AnalyticsTracker() {
    const pathname = usePathname();
    const last = useRef<string | null>(null);

    useEffect(() => {
        if (!pathname) return;
        if (pathname.startsWith("/admin")) return;

        if (last.current === pathname) return;
        last.current = pathname;

        apiFetchAuthed<void>("/track/pageview", {
            method: "POST",
            body: JSON.stringify({path: pathname}),
            keepalive: true,
        }).catch(() => {
        });
    }, [pathname]);

    return null;
}
