// src/lib/api/category.ts
import { apiFetchAuthed } from "@/lib/authedFetch";

export type Category = {
    tag: string;
    title: string;
};

export type CategoryRequest = {
    title: string;
};

// GET /api/category/get-all
export async function getAllCategories(): Promise<Category[]> {
    return apiFetchAuthed<Category[]>("/api/category/get-all");
}

// POST /api/category/create (staff only) -> Category
export async function createCategory(body: CategoryRequest): Promise<Category> {
    return apiFetchAuthed<Category>("/api/category/create", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

// DELETE /api/category/delete/{tag} (staff only) -> 204
export async function deleteCategory(tag: string): Promise<void> {
    const safe = encodeURIComponent(tag);
    await apiFetchAuthed<void>(`/api/category/delete/${safe}`, {
        method: "DELETE",
    });
}
