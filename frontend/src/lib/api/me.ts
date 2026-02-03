import { apiFetchAuthed } from "@/lib/authedFetch";

// ----------------------------- Types ------------------------------------

export type OnlyPublishedQuery = {
    only_published?: boolean;
};

export type ProgressListQuery = {
    only_published?: boolean;
    only_completed?: boolean;
};

export type PostIdBody = {
    post_id: number;
};

export type BookmarkedPost = {
    post_id: number;
    title: string;
    preview_text: string | null;
    category_tag: string;
    author: string;
    updated_at: string;
    bookmarked_at: string;
};

export type ProgressPost = {
    post_id: number;
    title: string;
    preview_text: string | null;
    category_tag: string;
    author: string;
    updated_at: string;
    is_completed: boolean;
    completed_at: string | null;
    last_read_at: string;
};

export type PostState = {
    saved: boolean;
    completed: boolean;
};

export type UserStats = {
    user_id: number;
    total_xp: number;
    posts_completed: number;
    modules_completed: number;
    updated_at: string;
};

// ----------------------------- Helpers ----------------------------------

function qs(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) sp.set(k, v);
    }
    const s = sp.toString();
    return s ? `?${s}` : "";
}

// ----------------------------- Post state -------------------------------

// GET /api/me/post-state/{post_id}
export async function getMyPostState(postId: number): Promise<PostState> {
    return apiFetchAuthed<PostState>(`/api/me/post-state/${postId}`, { method: "GET" });
}

// ----------------------------- Bookmarks --------------------------------

// GET /api/me/bookmarks?only_published=true|false
export async function listMyBookmarks(q?: OnlyPublishedQuery): Promise<BookmarkedPost[]> {
    return apiFetchAuthed<BookmarkedPost[]>(
        `/api/me/bookmarks${qs({
            only_published:
                typeof q?.only_published === "boolean" ? String(q.only_published) : undefined,
        })}`,
        { method: "GET" }
    );
}

// POST /api/me/bookmarks  { post_id } -> 204
export async function addMyBookmark(postId: number): Promise<void> {
    await apiFetchAuthed<void>("/api/me/bookmarks", {
        method: "POST",
        body: JSON.stringify({ post_id: postId } satisfies PostIdBody),
    });
}

// DELETE /api/me/bookmarks/{post_id} -> 204
export async function removeMyBookmark(postId: number): Promise<void> {
    await apiFetchAuthed<void>(`/api/me/bookmarks/${postId}`, { method: "DELETE" });
}

// ------------------------------ Reads -----------------------------------

// GET /api/me/reads?only_published=true&only_completed=true|false
export async function listMyReads(q?: ProgressListQuery): Promise<ProgressPost[]> {
    return apiFetchAuthed<ProgressPost[]>(
        `/api/me/reads${qs({
            only_published:
                typeof q?.only_published === "boolean" ? String(q.only_published) : undefined,
            only_completed:
                typeof q?.only_completed === "boolean" ? String(q.only_completed) : undefined,
        })}`,
        { method: "GET" }
    );
}

// POST /api/me/reads/complete/{post_id} -> 204
export async function markMyReadCompleted(postId: number): Promise<void> {
    await apiFetchAuthed<void>(`/api/me/reads/complete/${postId}`, { method: "POST" });
}

// DELETE /api/me/reads/complete/{post_id} -> 204
export async function uncompleteMyRead(postId: number): Promise<void> {
    await apiFetchAuthed<void>(`/api/me/reads/complete/${postId}`, { method: "DELETE" });
}

export type ModuleProgress = {
    module_id: number;
    total_posts: number;
    completed_posts: number;
    is_completed: boolean;
};

// GET /api/me/modules/progress
export async function listMyModuleProgress(): Promise<ModuleProgress[]> {
    return apiFetchAuthed<ModuleProgress[]>("/api/me/modules/progress", { method: "GET" });
}

// GET /api/me/stats
export async function getMyStats(): Promise<UserStats> {
    return apiFetchAuthed<UserStats>("/api/me/stats", { method: "GET" });
}
