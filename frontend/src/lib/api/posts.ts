// src/lib/api/posts.ts
import {apiFetch} from "@/lib/apiClient";
import {apiFetchAuthed} from "@/lib/authedFetch";


export type Post = {
    id: number;
    title: string;
    content_markdown: string;
    preview_text: string;
    category_tag: string;
    author: string;
    rating: number;
    is_published: boolean;
    created_at: string; // ISO
    updated_at: string; // ISO
};

export type PostRequest = {
    query?: string;
    tag?: string;
    offset?: number;
    limit?: number;
};

export type PostCreateRequest = {
    title: string;
    content_markdown: string;
    category_tag: string;
    author: string;
};

export type SetPublicRequest = {
    is_public: boolean;
};

// src/lib/api/posts.ts
// ... (импорты и типы как выше)

// GET /api/posts/search?query=&tag=&offset=&limit=
export async function searchPosts(params: PostRequest): Promise<Post[]> {
    const sp = new URLSearchParams();

    if (params.query) sp.set("query", params.query);
    if (params.tag) sp.set("tag", params.tag);
    if (typeof params.offset === "number") sp.set("offset", String(params.offset));
    if (typeof params.limit === "number") sp.set("limit", String(params.limit));

    const qs = sp.toString();
    return apiFetch<Post[]>(`/api/post/search${qs ? `?${qs}` : ""}`);
}

// GET /api/posts/get/{id}
export async function getPost(id: number): Promise<Post> {
    return apiFetch<Post>(`/api/post/get/${id}`);
}

// POST /api/posts/create (staff only) -> id
export async function createPost(body: PostCreateRequest): Promise<number> {
    return apiFetchAuthed<number>("/api/post/create", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

// POST /api/posts/suggest (any auth) -> id
export async function suggestPost(body: PostCreateRequest): Promise<number> {
    return apiFetchAuthed<number>("/api/post/suggest", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

// PUT /api/posts/update/{id} (staff) -> id (как на бэке service::update -> i64)
export async function updatePost(id: number, body: PostCreateRequest): Promise<number> {
    return apiFetchAuthed<number>(`/api/post/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
    });
}

// PUT /api/posts/set-public/{id} (staff) -> 204
export async function setPostPublic(id: number, isPublic: boolean): Promise<void> {
    await apiFetchAuthed<void>(`/api/post/set-public/${id}`, {
        method: "PUT",
        body: JSON.stringify({is_public: isPublic}),
    });
}

// DELETE /api/posts/delete/{id} (staff) -> 204
export async function deletePost(id: number): Promise<void> {
    await apiFetchAuthed<void>(`/api/post/delete/${id}`, {
        method: "DELETE",
    });
}

// --- Module navigation for post page ---

export type PostNav = {
    id: number;
    title: string;
};

export type ModulePostNav = {
    module_id: number;
    prev: PostNav | null;
    next: PostNav | null;
};

// GET /api/module/nav/by-post/{post_id}?module_id=5
export async function getPostModuleNav(
    postId: number,
    moduleId?: number
): Promise<ModulePostNav> {
    const sp = new URLSearchParams();
    if (typeof moduleId === "number" && Number.isFinite(moduleId)) {
        sp.set("module_id", String(moduleId));
    }

    const qs = sp.toString();
    return apiFetch<ModulePostNav>(`/api/module/nav/by-post/${postId}${qs ? `?${qs}` : ""}`);
}

