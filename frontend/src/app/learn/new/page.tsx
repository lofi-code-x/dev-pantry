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

    if (!ready) return null;
    if (!user) return null;
    if (!canAccess) return null;

    return <ModuleEditor mode="create"/>;
}
