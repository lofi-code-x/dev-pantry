// src/lib/api/uploads.ts
import {apiFetchAuthed} from "@/lib/authedFetch";
import {apiFetchFormAuthed} from "@/lib/authedFormFetch";

export type UploadResponse = {
    id: string; // uuid
    url: string;
};

export type UploadView = {
    id: string;
    url: string;
};

export async function uploadImage(file: File): Promise<UploadResponse> {
    const form = new FormData();
    form.append("file", file);

    return apiFetchFormAuthed<UploadResponse>("/api/uploads/images", {
        method: "POST",
        body: form,
    });
}

export async function uploadAvatar(file: File): Promise<UploadResponse> {
    const form = new FormData();
    form.append("file", file);

    return apiFetchFormAuthed<UploadResponse>("/api/uploads/avatar", {
        method: "POST",
        body: form,
    });
}

export async function deleteAvatar(): Promise<void> {
    await apiFetchAuthed<void>("/api/uploads/avatar", {method: "DELETE"});
}

// ✅ GET: картинки поста
export async function getPostImages(postId: number): Promise<UploadView[]> {
    return apiFetchAuthed<UploadView[]>(`/api/uploads/images/${postId}`, {
        method: "GET",
    });
}

// ✅ GET: картинки модуля (если надо)
export async function listModuleImages(moduleId: number | null): Promise<UploadView[]> {
    return apiFetchAuthed<UploadView[]>(`/api/uploads/modules/${moduleId}/images`, {
        method: "GET",
    });
}

// Возвращает map: { "1": UploadView|null, "2": ... }
export async function listModuleImagesBatch(
    moduleIds: number[]
): Promise<Record<string, UploadView | null>> {
    const ids = (moduleIds ?? [])
        .filter((x) => Number.isFinite(x) && x > 0)
        .map((x) => String(x))
        .join(",");

    // если пусто — вернём пустую мапу без запроса
    if (!ids) return {};

    return apiFetchAuthed<Record<string, UploadView | null>>(
        `/api/uploads/modules/images?ids=${encodeURIComponent(ids)}`,
        {method: "GET"}
    );
}
