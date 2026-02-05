"use client";

import React, {useEffect, useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {ApiError} from "@/lib/apiClient";
import {useAuth} from "@/components/auth/AuthProvider";
import type {UserRole} from "@/lib/types";

import {searchPosts, type Post} from "@/lib/api/posts";
import {
    createModule,
    createModuleSection,
    updateModule,
    createModuleItem,
    deleteModuleItem,
    listModuleItems,
    listModuleSections,
    deleteModuleSection,
    type ModuleItem,
    type ModuleCreateRequest,
    type ModuleUpdateRequest,
    type ModuleItemCreateRequest,
    type ModuleSectionPosts,
    type ModuleSectionCreateRequest,
} from "@/lib/api/modules";

import UploadImagesPanel, {type UploadedImage} from "@/components/posts/UploadImagesPanel";
import {listModuleImages} from "@/lib/api/uploads";

import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import SaveIcon from "@mui/icons-material/Save";

type Mode = "create" | "edit";

const STAFF_ROLES: UserRole[] = ["admin", "moderator", "editor"];

function isStaff(role: unknown) {
    return STAFF_ROLES.includes(String(role).toLowerCase() as UserRole);
}

function useDebounced<T>(value: T, delayMs: number) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = window.setTimeout(() => setV(value), delayMs);
        return () => window.clearTimeout(t);
    }, [value, delayMs]);
    return v;
}

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function makeTempId() {
    return `tmp-${Math.random().toString(36).slice(2)}`;
}

function buildInitialSections(initial?: ModuleSectionPosts[]): SectionDraft[] {
    const sections: SectionDraft[] = [];

    if (initial && initial.length > 0) {
        const sorted = [...initial].sort((a, b) => a.sort_order - b.sort_order);
        for (const s of sorted) {
            const isUnknown = s.is_unknown || s.id === null;
            sections.push({
                id: s.id ?? undefined,
                tempId: isUnknown ? "unknown" : `sec-${s.id}`,
                title: isUnknown ? "Без секции" : s.title,
                description: s.description ?? null,
                sort_order: s.sort_order,
                isUnknown,
                posts: s.posts ?? [],
            });
        }
    }

    if (!sections.some((s) => s.isUnknown)) {
        sections.push({
            tempId: "unknown",
            title: "Без секции",
            description: null,
            sort_order: 2147483647,
            isUnknown: true,
            posts: [],
        });
    }

    return sections;
}

const ringHover =
    "transition-[transform,background-color,border-color,box-shadow] duration-150 " +
    "hover:-translate-y-[1px] " +
    "hover:bg-[hsl(var(--ring)/0.10)] hover:border-[hsl(var(--ring)/0.45)] " +
    "hover:ring-2 hover:ring-inset hover:ring-ring/30 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/55";

const cardBase = "card-gloss ring-1 ring-inset ring-border";

type SectionDraft = {
    id?: number;
    tempId: string;
    title: string;
    description: string | null;
    sort_order: number;
    isUnknown?: boolean;
    posts: Post[];
};

export default function ModuleEditor({
                                         mode,
                                         moduleId,
                                         initial,
                                         initialSections,
                                     }: {
    mode: Mode;
    moduleId?: number;
    initial?: { title: string; description: string | null; is_published: boolean };
    initialSections?: ModuleSectionPosts[];
}) {
    const router = useRouter();
    const {user, ready} = useAuth();

    // base fields
    const [title, setTitle] = useState(initial?.title ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);

    // ✅ module images: массив, но maxItems=1
    const [moduleImages, setModuleImages] = useState<UploadedImage[]>([]);
    const [imageLoading, setImageLoading] = useState(false);
    const [imageErr, setImageErr] = useState<string | null>(null);

    // sections + posts
    const [sections, setSections] = useState<SectionDraft[]>(() => buildInitialSections(initialSections));
    const [sectionsInitialized, setSectionsInitialized] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState("");

    // search
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounced(query, 250);
    const [results, setResults] = useState<Post[]>([]);
    const [searchPending, setSearchPending] = useState(true);
    const [searchErr, setSearchErr] = useState<string | null>(null);

    // submit
    const [pending, setPending] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const canAccess = useMemo(() => {
        if (!ready) return false;
        if (!user) return false;
        return isStaff(user.role);
    }, [user, ready]);

    const selectedIds = useMemo(() => {
        const ids = new Set<number>();
        for (const s of sections) {
            for (const p of s.posts) ids.add(p.id);
        }
        return ids;
    }, [sections]);

    const unknownSectionTempId = useMemo(
        () => sections.find((s) => s.isUnknown)?.tempId ?? "unknown",
        [sections]
    );
    const [addTargetSectionId, setAddTargetSectionId] = useState<string>("unknown");

    useEffect(() => {
        if (!sections.some((s) => s.tempId === addTargetSectionId)) {
            setAddTargetSectionId(unknownSectionTempId);
        }
    }, [sections, addTargetSectionId, unknownSectionTempId]);

    // guard
    useEffect(() => {
        if (!ready) return;
        if (!user) {
            router.replace("/login");
            return;
        }
        if (!isStaff(user.role)) router.replace("/learn");
    }, [user, ready, router]);

    useEffect(() => {
        if (sectionsInitialized) return;
        if (mode === "create") {
            setSections(buildInitialSections(undefined));
            setSectionsInitialized(true);
            return;
        }
        if (initialSections) {
            setSections(buildInitialSections(initialSections));
            setSectionsInitialized(true);
        }
    }, [initialSections, mode, sectionsInitialized]);

    // ✅ load module image on edit
    // ✅ load module image on edit
    useEffect(() => {
        if (!ready) return;
        if (!user) return;
        if (!canAccess) return;
        if (mode !== "edit") return;

        // ✅ FIX: сузили тип moduleId до number
        if (typeof moduleId !== "number" || !Number.isFinite(moduleId) || moduleId <= 0) {
            setModuleImages([]);
            return;
        }

        const mid = moduleId; // mid: number

        let cancelled = false;

        async function loadImg() {
            setImageLoading(true);
            setImageErr(null);
            try {
                const list = await listModuleImages(mid); // ✅ mid: number (TS ок)
                if (cancelled) return;

                const first = list?.[0] ?? null;

                if (first) {
                    setModuleImages([
                        {
                            id: String(first.id),
                            name: "module-image",
                            url: String(first.url),
                        },
                    ]);
                } else {
                    setModuleImages([]);
                }
            } catch (e: any) {
                if (cancelled) return;
                if (e instanceof ApiError) setImageErr(e.message);
                else setImageErr("Failed to load module image.");
            } finally {
                if (!cancelled) setImageLoading(false);
            }
        }

        loadImg();

        return () => {
            cancelled = true;
        };
    }, [ready, user?.id, canAccess, mode, moduleId]);


    // search posts
    useEffect(() => {
        let cancelled = false;

        async function run() {
            setSearchPending(true);
            setSearchErr(null);
            try {
                const res = await searchPosts({
                    query: debouncedQuery ? debouncedQuery : undefined,
                    offset: 0,
                    limit: 10,
                });
                if (!cancelled) setResults(res);
            } catch (e) {
                if (cancelled) return;
                if (e instanceof ApiError) setSearchErr(e.message);
                else setSearchErr("Failed to load posts.");
            } finally {
                if (!cancelled) setSearchPending(false);
            }
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [debouncedQuery]);

    function addSection() {
        const title = newSectionTitle.trim();
        if (!title) {
            setErr("Section title is required.");
            return;
        }
        setSections((prev) => {
            const next = prev.slice();
            const unknownIdx = next.findIndex((s) => s.isUnknown);
            const insertIdx = unknownIdx >= 0 ? unknownIdx : next.length;
            next.splice(insertIdx, 0, {
                tempId: makeTempId(),
                title,
                description: null,
                sort_order: insertIdx,
                posts: [],
            });
            return next;
        });
        setNewSectionTitle("");
    }

    function removeSection(tempId: string) {
        setSections((prev) => {
            const removed = prev.find((s) => s.tempId === tempId);
            if (!removed) return prev;

            const next = prev.filter((s) => s.tempId !== tempId);
            const unknownIdx = next.findIndex((s) => s.isUnknown);

            if (removed.posts.length > 0) {
                if (unknownIdx >= 0) {
                    const unknown = next[unknownIdx];
                    next[unknownIdx] = {
                        ...unknown,
                        posts: [...unknown.posts, ...removed.posts],
                    };
                } else {
                    next.push({
                        tempId: "unknown",
                        title: "Без секции",
                        description: null,
                        sort_order: 2147483647,
                        isUnknown: true,
                        posts: removed.posts,
                    });
                }
            }

            return next;
        });
    }

    function addPostToSection(post: Post, targetTempId: string) {
        setSections((prev) => {
            let movedPost: Post | null = null;
            const cleaned = prev.map((s) => {
                const idx = s.posts.findIndex((p) => p.id === post.id);
                if (idx < 0) return s;
                const copy = s.posts.slice();
                movedPost = copy.splice(idx, 1)[0];
                return {...s, posts: copy};
            });

            const targetIdx = cleaned.findIndex((s) => s.tempId === targetTempId);
            if (targetIdx < 0) return prev;
            const target = cleaned[targetIdx];
            cleaned[targetIdx] = {
                ...target,
                posts: [...target.posts, movedPost ?? post],
            };
            return cleaned;
        });
    }

    function removePost(sectionTempId: string, postId: number) {
        setSections((prev) =>
            prev.map((s) =>
                s.tempId === sectionTempId
                    ? {...s, posts: s.posts.filter((p) => p.id !== postId)}
                    : s
            )
        );
    }

    function movePost(sectionTempId: string, postId: number, dir: -1 | 1) {
        setSections((prev) =>
            prev.map((s) => {
                if (s.tempId !== sectionTempId) return s;
                const idx = s.posts.findIndex((p) => p.id === postId);
                if (idx < 0) return s;
                const nextIdx = idx + dir;
                if (nextIdx < 0 || nextIdx >= s.posts.length) return s;
                const copy = s.posts.slice();
                const tmp = copy[idx];
                copy[idx] = copy[nextIdx];
                copy[nextIdx] = tmp;
                return {...s, posts: copy};
            })
        );
    }

    function movePostToSection(sectionTempId: string, postId: number, targetTempId: string) {
        if (sectionTempId === targetTempId) return;
        setSections((prev) => {
            let moving: Post | null = null;
            const next = prev.map((s) => {
                if (s.tempId !== sectionTempId) return s;
                const idx = s.posts.findIndex((p) => p.id === postId);
                if (idx < 0) return s;
                const copy = s.posts.slice();
                moving = copy.splice(idx, 1)[0];
                return {...s, posts: copy};
            });

            if (!moving) return prev;
            const targetIdx = next.findIndex((s) => s.tempId === targetTempId);
            if (targetIdx < 0) return prev;
            const target = next[targetIdx];
            next[targetIdx] = {...target, posts: [...target.posts, moving]};
            return next;
        });
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setErr(null);

        if (!user) return;
        if (!canAccess) return setErr("You don't have permission.");

        const t = title.trim();
        if (!t) return setErr("Title is required.");
        if (mode === "edit" && !moduleId) return setErr("Missing moduleId.");

        const sectionsToSave = sections.filter((s) => !s.isUnknown);
        for (const s of sectionsToSave) {
            if (!s.title.trim()) {
                return setErr("Section title is required.");
            }
        }

        const image_upload_id = moduleImages[0]?.id ?? null;

        setPending(true);
        try {
            if (mode === "create") {
                const body: ModuleCreateRequest = {
                    title: t,
                    description: description.trim() ? description.trim() : null,
                    author_id: user.id,
                    is_published: isPublished,
                    image_upload_id,
                };

                const newId = await createModule(body);

                const sectionIdByTemp = new Map<string, number>();
                for (let i = 0; i < sectionsToSave.length; i++) {
                    const s = sectionsToSave[i];
                    const secBody: ModuleSectionCreateRequest = {
                        module_id: newId,
                        title: s.title.trim(),
                        description: s.description ?? null,
                        sort_order: i,
                    };
                    const sectionId = await createModuleSection(secBody);
                    sectionIdByTemp.set(s.tempId, sectionId);
                }

                for (const s of sections) {
                    const section_id = s.isUnknown ? null : sectionIdByTemp.get(s.tempId) ?? null;
                    for (let i = 0; i < s.posts.length; i++) {
                        const p = s.posts[i];
                        const itemBody: ModuleItemCreateRequest = {
                            module_id: newId,
                            post_id: p.id,
                            section_id,
                            sort_order: i,
                        };
                        await createModuleItem(itemBody);
                    }
                }

                router.push(`/learn/${newId}`);
                router.refresh();
                return;
            }

            const updateBody: ModuleUpdateRequest = {
                title: t,
                description: description.trim() ? description.trim() : null,
                image_upload_id,
            };
            await updateModule(moduleId!, updateBody);

            const currentItems: ModuleItem[] = await listModuleItems(moduleId!);
            for (const it of currentItems) await deleteModuleItem(it.id);

            const currentSections = await listModuleSections(moduleId!);
            for (const s of currentSections) await deleteModuleSection(s.id);

            const sectionIdByTemp = new Map<string, number>();
            for (let i = 0; i < sectionsToSave.length; i++) {
                const s = sectionsToSave[i];
                const secBody: ModuleSectionCreateRequest = {
                    module_id: moduleId!,
                    title: s.title.trim(),
                    description: s.description ?? null,
                    sort_order: i,
                };
                const sectionId = await createModuleSection(secBody);
                sectionIdByTemp.set(s.tempId, sectionId);
            }

            for (const s of sections) {
                const section_id = s.isUnknown ? null : sectionIdByTemp.get(s.tempId) ?? null;
                for (let i = 0; i < s.posts.length; i++) {
                    const p = s.posts[i];
                    await createModuleItem({
                        module_id: moduleId!,
                        post_id: p.id,
                        section_id,
                        sort_order: i,
                    });
                }
            }

            router.push(`/learn/${moduleId}`);
            router.refresh();
        } catch (e) {
            if (e instanceof ApiError) setErr(e.message);
            else setErr("Request failed.");
        } finally {
            setPending(false);
        }
    }

    if (!ready || !user) return null;

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight text-fg">
                    {mode === "create" ? "Create module" : "Edit module"}
                </h1>
                <p className="mt-2 text-sm text-muted-fg">
                    Fill module details, attach one cover image, and attach posts (no duplicates).
                </p>
            </header>

            {!canAccess ? (
                <section className={cn(cardBase, "p-6")}>
                    <div className="text-sm text-muted-fg">Access denied.</div>
                </section>
            ) : (
                <form onSubmit={onSubmit} className="grid gap-4">
                    <section className={cn(cardBase, "p-6")}>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-6">
                                <label className="block text-sm font-medium text-fg">Title</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="input mt-2"
                                    placeholder="Module title"
                                    disabled={pending}
                                />
                            </div>

                            <div className="lg:col-span-6">
                                <label className="block text-sm font-medium text-fg">Visibility</label>
                                <div className="mt-2 flex items-center gap-2">
                                    <input
                                        id="pub"
                                        type="checkbox"
                                        checked={isPublished}
                                        onChange={(e) => setIsPublished(e.target.checked)}
                                        className="h-4 w-4 accent-[hsl(var(--ring))]"
                                        disabled={pending}
                                    />
                                    <label htmlFor="pub" className="text-sm text-fg">
                                        Public
                                    </label>
                                    <span className="text-xs text-muted-fg">
                    {isPublished ? "Visible to all" : "Hidden (draft)"}
                  </span>
                                </div>
                            </div>

                            <div className="lg:col-span-12">
                                <label className="block text-sm font-medium text-fg">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="input mt-2"
                                    placeholder="Optional module description"
                                    disabled={pending}
                                />
                            </div>

                            <div className="lg:col-span-12">
                                <div className="mb-2">
                                    <div className="text-sm font-medium text-fg">Module image</div>
                                    <div className="text-xs text-muted-fg">One image per module (cover).</div>
                                </div>

                                {imageErr ? (
                                    <div
                                        className={cn(
                                            "mb-3 rounded-xl border p-3 text-sm text-fg",
                                            "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                                            "ring-1 ring-inset ring-ring/15"
                                        )}
                                    >
                                        {imageErr}
                                    </div>
                                ) : null}

                                {imageLoading ? <div className="mb-3 text-sm text-muted-fg">Loading image…</div> : null}

                                <UploadImagesPanel
                                    disabled={pending}
                                    value={moduleImages}
                                    onChange={(next) => setModuleImages(next.slice(0, 1))}
                                    maxItems={1}
                                />
                            </div>
                        </div>

                        {err ? (
                            <div
                                className={cn(
                                    "mt-4 rounded-xl border p-3 text-sm text-fg",
                                    "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                                    "ring-1 ring-inset ring-ring/15"
                                )}
                            >
                                {err}
                            </div>
                        ) : null}
                    </section>

                    {/* posts pickers */}
                    <section className="grid gap-4 lg:grid-cols-2">
                        {/* selected */}
                        <div className={cn(cardBase, "p-6")}>
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium text-fg">Sections</div>
                                    <div className="text-xs text-muted-fg">Group posts by section.</div>
                                </div>
                                <div className="text-xs text-muted-fg">{selectedIds.size} posts</div>
                            </div>

                            <div className="mb-3 flex items-center gap-2">
                                <input
                                    value={newSectionTitle}
                                    onChange={(e) => setNewSectionTitle(e.target.value)}
                                    className="input h-9 flex-1"
                                    placeholder="New section title"
                                    disabled={pending}
                                />
                                <button
                                    type="button"
                                    onClick={addSection}
                                    disabled={pending}
                                    className={cn("btn px-3 py-2 text-sm", ringHover)}
                                >
                                    <AddIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                                    Add section
                                </button>
                            </div>

                            <div className="max-h-[50vh] overflow-auto pr-1">
                                {sections.length === 0 ? (
                                    <div className="text-sm text-muted-fg">No sections yet.</div>
                                ) : (
                                    <ul className="space-y-3">
                                        {sections.map((section) => (
                                            <li
                                                key={section.tempId}
                                                className={cn(
                                                    "rounded-xl border border-border p-3",
                                                    "bg-[hsl(var(--ring)/0.03)]"
                                                )}
                                            >
                                                <div className="mb-2 flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        {section.isUnknown ? (
                                                            <div className="text-sm font-medium text-fg">
                                                                Без секции
                                                            </div>
                                                        ) : (
                                                            <input
                                                                value={section.title}
                                                                onChange={(e) =>
                                                                    setSections((prev) =>
                                                                        prev.map((s) =>
                                                                            s.tempId === section.tempId
                                                                                ? {...s, title: e.target.value}
                                                                                : s
                                                                        )
                                                                    )
                                                                }
                                                                className="input h-9"
                                                                placeholder="Section title"
                                                                disabled={pending}
                                                            />
                                                        )}
                                                        <div className="mt-1 text-xs text-muted-fg">
                                                            {section.posts.length} posts
                                                        </div>
                                                    </div>

                                                    {!section.isUnknown ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSection(section.tempId)}
                                                            disabled={pending}
                                                            className={cn(
                                                                "btn h-8 px-2 text-xs",
                                                                ringHover,
                                                                "hover:bg-[hsl(0_90%_55%/0.10)] hover:border-[hsl(0_90%_55%/0.45)] hover:ring-2 hover:ring-inset hover:ring-[hsl(0_90%_55%/0.28)]",
                                                                "disabled:cursor-not-allowed disabled:opacity-60"
                                                            )}
                                                        >
                                                            <CloseIcon sx={{fontSize: 16}}/>
                                                            Delete
                                                        </button>
                                                    ) : null}
                                                </div>

                                                {section.posts.length === 0 ? (
                                                    <div className="text-xs text-muted-fg">
                                                        No posts in this section.
                                                    </div>
                                                ) : (
                                                    <ul className="space-y-2">
                                                        {section.posts.map((p, idx) => (
                                                            <li
                                                                key={p.id}
                                                                className={cn(
                                                                    "rounded-lg p-2",
                                                                    "ring-1 ring-inset ring-border",
                                                                    "bg-[hsl(var(--ring)/0.05)]"
                                                                )}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <div className="min-w-0 flex-1">
                                                                        <div
                                                                            className="truncate text-sm font-medium text-fg">
                                                                            {idx + 1}. {p.title}
                                                                        </div>
                                                                        <div
                                                                            className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                                                                            <span
                                                                                className="rounded-md border border-border bg-[hsl(var(--ring)/0.08)] px-2 py-0.5">
                                                                                {p.category_tag}
                                                                            </span>
                                                                            <span>{p.author}</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <select
                                                                            value={section.tempId}
                                                                            onChange={(e) =>
                                                                                movePostToSection(
                                                                                    section.tempId,
                                                                                    p.id,
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            className="input h-8 px-2 text-xs"
                                                                            disabled={pending}
                                                                            aria-label="Move to section"
                                                                        >
                                                                            {sections.map((s) => (
                                                                                <option key={s.tempId} value={s.tempId}>
                                                                                    {s.isUnknown ? "Без секции" : s.title}
                                                                                </option>
                                                                            ))}
                                                                        </select>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => movePost(section.tempId, p.id, -1)}
                                                                            disabled={idx === 0 || pending}
                                                                            className={cn(
                                                                                "btn h-8 w-8 px-0",
                                                                                ringHover,
                                                                                "disabled:cursor-not-allowed disabled:opacity-50"
                                                                            )}
                                                                            title="Move up"
                                                                            aria-label="Move up"
                                                                        >
                                                                            <ArrowUpwardIcon sx={{fontSize: 18}}/>
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => movePost(section.tempId, p.id, 1)}
                                                                            disabled={idx === section.posts.length - 1 || pending}
                                                                            className={cn(
                                                                                "btn h-8 w-8 px-0",
                                                                                ringHover,
                                                                                "disabled:cursor-not-allowed disabled:opacity-50"
                                                                            )}
                                                                            title="Move down"
                                                                            aria-label="Move down"
                                                                        >
                                                                            <ArrowDownwardIcon sx={{fontSize: 18}}/>
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removePost(section.tempId, p.id)}
                                                                            disabled={pending}
                                                                            className={cn(
                                                                                "btn h-8 w-8 px-0",
                                                                                ringHover,
                                                                                "hover:bg-[hsl(0_90%_55%/0.10)] hover:border-[hsl(0_90%_55%/0.45)] hover:ring-2 hover:ring-inset hover:ring-[hsl(0_90%_55%/0.28)]",
                                                                                "disabled:cursor-not-allowed disabled:opacity-60"
                                                                            )}
                                                                            title="Remove"
                                                                            aria-label="Remove"
                                                                        >
                                                                            <CloseIcon sx={{fontSize: 18}}/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* search */}
                        <div className={cn(cardBase, "p-6")}>
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium text-fg">Add posts</div>
                                    <div className="text-xs text-muted-fg">Default: last 10 posts.</div>
                                </div>
                                <div className="text-xs text-muted-fg">
                                    {searchPending ? "Loading..." : `${results.length} results`}
                                </div>
                            </div>

                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="input"
                                placeholder="Search posts… (axum, jwt, sqlx)"
                                disabled={pending}
                            />

                            <div className="mt-3 flex items-center gap-2">
                                <label className="text-xs text-muted-fg">Add to section</label>
                                <select
                                    value={addTargetSectionId}
                                    onChange={(e) => setAddTargetSectionId(e.target.value)}
                                    className="input h-8 px-2 text-xs"
                                    disabled={pending}
                                >
                                    {sections.map((s) => (
                                        <option key={s.tempId} value={s.tempId}>
                                            {s.isUnknown ? "Без секции" : s.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {searchErr ? (
                                <div
                                    className={cn(
                                        "mt-3 rounded-xl border p-3 text-sm text-fg",
                                        "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                                        "ring-1 ring-inset ring-ring/15"
                                    )}
                                >
                                    {searchErr}
                                </div>
                            ) : null}

                            <div className="mt-3 max-h-[50vh] overflow-auto pr-1">
                                {searchPending ? (
                                    <div className="text-sm text-muted-fg">Loading…</div>
                                ) : results.length === 0 ? (
                                    <div className="text-sm text-muted-fg">No posts found.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {results.map((p) => {
                                            const already = selectedIds.has(p.id);
                                            const inTarget =
                                                sections
                                                    .find((s) => s.tempId === addTargetSectionId)
                                                    ?.posts.some((sp) => sp.id === p.id) ?? false;

                                            return (
                                                <li
                                                    key={p.id}
                                                    className={cn(
                                                        "rounded-xl p-3",
                                                        "ring-1 ring-inset ring-border",
                                                        "bg-[hsl(var(--ring)/0.03)]"
                                                    )}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="min-w-0 flex-1">
                                                            <div
                                                                className="truncate text-sm font-medium text-fg">{p.title}</div>
                                                            <div
                                                                className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-fg">
                                <span
                                    className="rounded-md border border-border bg-[hsl(var(--ring)/0.08)] px-2 py-0.5">
                                  {p.category_tag}
                                </span>
                                                                <span>{p.author}</span>
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => addPostToSection(p, addTargetSectionId)}
                                                            disabled={inTarget || pending}
                                                            className={cn(
                                                                "btn px-3 py-2 text-sm",
                                                                ringHover,
                                                                "disabled:cursor-not-allowed disabled:opacity-60"
                                                            )}
                                                            aria-label={
                                                                inTarget
                                                                    ? "Already in this section"
                                                                    : already
                                                                        ? "Move to section"
                                                                        : "Add post"
                                                            }
                                                            title={
                                                                inTarget
                                                                    ? "Already in this section"
                                                                    : already
                                                                        ? "Move to section"
                                                                        : "Add post"
                                                            }
                                                        >
                                                            {inTarget ? (
                                                                <>
                                                                    <CheckIcon sx={{fontSize: 18}}
                                                                               className="text-muted-fg"/>
                                                                    Added
                                                                </>
                                                            ) : already ? (
                                                                <>
                                                                    <ArrowUpwardIcon sx={{fontSize: 18}}
                                                                                     className="text-muted-fg"/>
                                                                    Move
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <AddIcon sx={{fontSize: 18}}
                                                                             className="text-muted-fg"/>
                                                                    Add
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={pending}
                            className={cn("btn px-4 py-2", "disabled:cursor-not-allowed disabled:opacity-60")}
                        >
                            <SaveIcon sx={{fontSize: 18}} className="text-muted-fg"/>
                            {pending ? "Saving..." : mode === "create" ? "Create module" : "Save changes"}
                        </button>
                    </div>
                </form>
            )}
        </main>
    );
}
