// src/lib/api/modules.ts
import { apiFetch } from "@/lib/apiClient";
import { apiFetchAuthed } from "@/lib/authedFetch";
import type { Post } from "@/lib/api/posts";

/** То, что возвращает select_module_list: author как login (строка), без posts */
export type Module = {
    id: number;
    title: string;
    description: string | null;
    author: string;
    rating: number;
    is_published: boolean;
    created_at: string;
    updated_at: string;
};

// ✅ чтобы можно было: `import { type Post } from "@/lib/api/modules"`
export type { Post };

export type ModuleCreateRequest = {
    title: string;
    description: string | null;
    author_id: number;
    is_published: boolean;

    // ✅ cover image (uuid) или null
    image_upload_id?: string | null;
};

export type ModuleUpdateRequest = {
    title: string;
    description: string | null;

    // ✅ desired state: uuid or null (remove)
    image_upload_id?: string | null;
};

export type ModuleSetPublicRequest = {
    is_public: boolean;
};

export type ModuleItem = {
    id: number;
    module_id: number;
    post_id: number;
    sort_order: number;
};

export type ModuleItemCreateRequest = {
    module_id: number;
    post_id: number;
    sort_order: number;
};

export type ModuleItemUpdateRequest = {
    sort_order: number;
};

export type OnlyPublishedQuery = {
    only_published?: boolean;
};

function qsOnlyPublished(q?: OnlyPublishedQuery) {
    const sp = new URLSearchParams();
    if (typeof q?.only_published === "boolean") sp.set("only_published", String(q.only_published));
    const qs = sp.toString();
    return qs ? `?${qs}` : "";
}

// ----------------------------- Modules ----------------------------------

// GET /api/module/list?only_published=true
export async function listModules(q?: OnlyPublishedQuery): Promise<Module[]> {
    return apiFetch<Module[]>(`/api/module/list${qsOnlyPublished(q)}`);
}

export async function getModule(id: number): Promise<Module> {
    return apiFetch<Module>(`/api/module/get/${id}`);
}

// GET /api/module/get-posts/{id}?only_published=true
export async function getModulePosts(moduleId: number | null, q?: OnlyPublishedQuery): Promise<Post[]> {
    return apiFetch<Post[]>(`/api/module/get-posts/${moduleId}${qsOnlyPublished(q)}`);
}

export async function listModuleItems(moduleId: number): Promise<ModuleItem[]> {
    return apiFetchAuthed<ModuleItem[]>(`/api/module/${moduleId}/items`, { method: "GET" });
}

// POST /api/module/create (staff) -> id
export async function createModule(body: ModuleCreateRequest): Promise<number> {
    return apiFetchAuthed<number>("/api/module/create", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

// PUT /api/module/update/{id} (staff) -> id
export async function updateModule(id: number, body: ModuleUpdateRequest): Promise<number> {
    return apiFetchAuthed<number>(`/api/module/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
    });
}

// PUT /api/module/set-public/{id} (staff) -> 204
export async function setModulePublic(id: number, isPublic: boolean): Promise<void> {
    await apiFetchAuthed<void>(`/api/module/set-public/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_public: isPublic } satisfies ModuleSetPublicRequest),
    });
}

// DELETE /api/module/delete/{id} (staff) -> 204
export async function deleteModule(id: number): Promise<void> {
    await apiFetchAuthed<void>(`/api/module/delete/${id}`, { method: "DELETE" });
}

// --------------------------- Module Items --------------------------------

// POST /api/module/item/create (staff) -> id
export async function createModuleItem(body: ModuleItemCreateRequest): Promise<number> {
    return apiFetchAuthed<number>("/api/module/item/create", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

// PUT /api/module/item/update/{id} (staff) -> 204
export async function updateModuleItem(id: number, body: ModuleItemUpdateRequest): Promise<void> {
    await apiFetchAuthed<void>(`/api/module/item/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
    });
}

// DELETE /api/module/item/delete/{id} (staff) -> 204
export async function deleteModuleItem(id: number): Promise<void> {
    await apiFetchAuthed<void>(`/api/module/item/delete/${id}`, { method: "DELETE" });
}
