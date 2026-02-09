// src/lib/api/modules.ts
import {apiFetchAuthed} from "@/lib/authedFetch";
import type {Post} from "@/lib/api/posts";

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
export type {Post};

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
    section_id: number | null;
    sort_order: number;
};

export type ModuleItemCreateRequest = {
    module_id: number;
    post_id: number;
    section_id?: number | null;
    sort_order: number;
};

export type ModuleSection = {
    id: number;
    module_id: number;
    title: string;
    description: string | null;
    sort_order: number;
    created_at: string;
};

export type ModuleSectionPosts = {
    id: number | null;
    title: string;
    description: string | null;
    sort_order: number;
    is_unknown: boolean;
    posts: Post[];
};

export type ModuleSectionCreateRequest = {
    module_id: number;
    title: string;
    description: string | null;
    sort_order: number;
};

// ----------------------------- Modules ----------------------------------

// GET /api/module/list?only_published=true
export async function listModules(): Promise<Module[]> {
    return apiFetchAuthed<Module[]>(`/module/list`);
}

export async function getModule(moduleId: number | null): Promise<Module> {
    return apiFetchAuthed<Module>(`/module/get/${moduleId}`);
}

// GET /api/module/get-posts/{id}?only_published=true
export async function getModulePosts(
    moduleId: number | null,
): Promise<ModuleSectionPosts[]> {
    return apiFetchAuthed<ModuleSectionPosts[]>(`/module/get-posts/${moduleId}`);
}

export async function listModuleItems(moduleId: number): Promise<ModuleItem[]> {
    return apiFetchAuthed<ModuleItem[]>(`/module/${moduleId}/items`, {method: "GET"});
}

export async function listModuleSections(moduleId: number): Promise<ModuleSection[]> {
    return apiFetchAuthed<ModuleSection[]>(`/module/${moduleId}/sections`, {method: "GET"});
}

// POST /api/module/create (staff) -> id
export async function createModule(body: ModuleCreateRequest): Promise<number> {
    return apiFetchAuthed<number>("/module/create", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

// PUT /api/module/update/{id} (staff) -> id
export async function updateModule(id: number, body: ModuleUpdateRequest): Promise<number> {
    return apiFetchAuthed<number>(`/module/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
    });
}

// PUT /api/module/set-public/{id} (staff) -> 204
export async function setModulePublic(id: number, isPublic: boolean): Promise<void> {
    await apiFetchAuthed<void>(`/module/set-public/${id}`, {
        method: "PUT",
        body: JSON.stringify({is_public: isPublic} satisfies ModuleSetPublicRequest),
    });
}

// DELETE /api/module/delete/{id} (staff) -> 204
export async function deleteModule(id: number): Promise<void> {
    await apiFetchAuthed<void>(`/module/delete/${id}`, {method: "DELETE"});
}

// --------------------------- Module Items --------------------------------

// POST /api/module/item/create (staff) -> id
export async function createModuleItem(body: ModuleItemCreateRequest): Promise<number> {
    return apiFetchAuthed<number>("/module/item/create", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

// DELETE /api/module/item/delete/{id} (staff) -> 204
export async function deleteModuleItem(id: number): Promise<void> {
    await apiFetchAuthed<void>(`/module/item/delete/${id}`, {method: "DELETE"});
}

// -------------------------- Module Sections -----------------------------

// POST /api/module/section/create (staff) -> id
export async function createModuleSection(body: ModuleSectionCreateRequest): Promise<number> {
    return apiFetchAuthed<number>("/module/section/create", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

// DELETE /api/module/section/delete/{id} (staff) -> 204
export async function deleteModuleSection(id: number): Promise<void> {
    await apiFetchAuthed<void>(`/module/section/delete/${id}`, {method: "DELETE"});
}
