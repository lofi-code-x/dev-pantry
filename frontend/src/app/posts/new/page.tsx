// src/app/posts/new/page.tsx
"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {useAuth} from "@/components/auth/AuthProvider";
import PostEditor from "@/components/posts/PostEditor";

const STAFF_ROLES = ["admin", "moderator", "editor"] as const;

export default function NewPostPage() {
    const router = useRouter();
    const {user, ready} = useAuth();

    useEffect(() => {
        if (!ready) return;

        if (!user) {
            router.replace("/login");
            return;
        }

        const role = String(user.role).toLowerCase();
        const isStaff = (STAFF_ROLES as readonly string[]).includes(role);
        if (!isStaff) router.replace("/posts");
    }, [ready, user, router]);

    if (!ready) return null;
    if (!user) return null;

    return <PostEditor mode="create"/>;
}
