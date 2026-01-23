// src/lib/api/uploads.ts
import {apiFetchFormAuthed} from "@/lib/authedFormFetch";

export type UploadResponse = {
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
