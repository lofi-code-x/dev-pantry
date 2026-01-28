"use client";

import {useEffect, useMemo} from "react";
import {useRouter} from "next/navigation";
import ModuleEditor from "@/components/modules/ModuleEditor";
import {useAuth} from "@/components/auth/AuthProvider";
import type {UserRole} from "@/lib/types";

const STAFF_ROLES: UserRole[] = ["admin", "moderator", "editor"];

function isStaff(role: unknown) {
    return STAFF_ROLES.includes(String(role).toLowerCase() as UserRole);
}

function PageShell({children}: { children: React.ReactNode }) {
    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-fg shadow-sm">
                {children}
            </div>
        </main>
    );
}

export default function NewModulePage() {
    const router = useRouter();
    const {user, ready} = useAuth();

    const canAccess = useMemo(() => {
        if (!ready) return false;
        if (!user) return false;
        return isStaff(user.role);
    }, [ready, user]);

    useEffect(() => {
        if (!ready) return;

        if (!user) {
            router.replace("/login");
            return;
        }

        if (!isStaff(user.role)) {
            router.replace("/learn");
        }
    }, [ready, user, router]);

    if (!ready) {
        return <PageShell>Loading…</PageShell>;
    }

    if (!user) {
        // редирект в useEffect — здесь просто не мигаем пустотой
        return <PageShell>Redirecting to login…</PageShell>;
    }

    if (!canAccess) {
        return <PageShell>Access denied.</PageShell>;
    }

    return <ModuleEditor mode="create"/>;
}
