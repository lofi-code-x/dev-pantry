// src/app/posts/suggest/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import PostEditor from "@/components/posts/PostEditor";

export default function SuggestPostPage() {
    const router = useRouter();
    const { user, ready } = useAuth();

    useEffect(() => {
        if (!ready) return;
        if (!user) router.replace("/login");
    }, [ready, user, router]);

    if (!ready) return null;
    if (!user) return null;

    return <PostEditor mode="suggest" />;
}
