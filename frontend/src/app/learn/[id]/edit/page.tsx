"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ModuleEditor from "@/components/modules/ModuleEditor";
import { ApiError } from "@/lib/apiClient";
import { useAuth } from "@/components/auth/AuthProvider";
import { getModule, getModulePosts } from "@/lib/api/modules";
import type { Module } from "@/lib/api/modules";
import type { Post } from "@/lib/api/posts";
import type { UserRole } from "@/lib/types";

const STAFF_ROLES: UserRole[] = ["admin", "moderator", "editor"];
function isStaff(role: unknown) {
    return STAFF_ROLES.includes(String(role).toLowerCase() as UserRole);
}

export default function EditModulePage() {
    const params = useParams<{ id: string }>();
    const moduleId = Number(params.id);
    const router = useRouter();
    const { user, ready } = useAuth();

    const [mod, setMod] = useState<Module | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!ready) return;

        if (!user) {
            router.replace("/login");
            return;
        }
        if (!isStaff(user.role)) {
            router.replace("/learn");
            return;
        }

        let cancelled = false;

        async function load() {
            setErr(null);
            try {
                const m = await getModule(moduleId);
                const ps = await getModulePosts(moduleId, { only_published: false });
                if (cancelled) return;
                setMod(m);
                setPosts(ps);
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError) setErr(e.message);
                else setErr("Failed to load module.");
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [ready, user, moduleId, router]);

    if (!ready) return null;
    if (!user) return null;

    if (err) {
        return (
            <main className="mx-auto w-full max-w-6xl px-6 py-10">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-800">
                    {err}
                </div>
            </main>
        );
    }

    if (!mod) return null;

    return (
        <ModuleEditor
            mode="edit"
            moduleId={moduleId}
            initial={{
                title: mod.title,
                description: mod.description,
                is_published: mod.is_published,
            }}
            initialPosts={posts}
        />
    );
}
