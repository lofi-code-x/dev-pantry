// src/lib/api/posts.ts
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

    image_upload_ids: string[]; // <-- добавили
};

export type SetPublicRequest = {
    is_public: boolean;
};

export type QuizOption = {
    id: number;
    option_text: string;
};

export type QuizQuestion = {
    id: number;
    question_text: string;
    sort_order: number;
    options: QuizOption[];
};

export type QuizOptionAdmin = {
    id: number;
    option_text: string;
    is_correct: boolean;
};

export type QuizQuestionAdmin = {
    id: number;
    question_text: string;
    sort_order: number;
    options: QuizOptionAdmin[];
};

export type QuizAnswer = {
    question_id: number;
    option_id: number;
};

export type QuizSubmitRequest = {
    answers: QuizAnswer[];
};

export type QuizSubmitResult = {
    total_questions: number;
    correct_answers: number;
    is_passed: boolean;
};

export type QuizAttempt = {
    is_passed: boolean;
    answers: QuizAnswer[];
};

export type QuizQuestionCreateRequest = {
    post_id: number;
    question_text: string;
    sort_order: number;
};

export type QuizQuestionUpdateRequest = {
    question_text: string;
    sort_order: number;
};

export type QuizOptionCreateRequest = {
    question_id: number;
    option_text: string;
    is_correct: boolean;
};

export type QuizOptionUpdateRequest = {
    option_text: string;
    is_correct: boolean;
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
    return apiFetchAuthed<Post[]>(`/api/post/search${qs ? `?${qs}` : ""}`);
}

// GET /api/posts/get/{id}
export async function getPost(id: number): Promise<Post> {
    return apiFetchAuthed<Post>(`/api/post/get/${id}`);
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

// ----------------------------- Quiz -------------------------------------

export async function getPostQuiz(postId: number): Promise<QuizQuestion[]> {
    return apiFetchAuthed<QuizQuestion[]>(`/api/post/${postId}/quiz`);
}

export async function getPostQuizAdmin(postId: number): Promise<QuizQuestionAdmin[]> {
    return apiFetchAuthed<QuizQuestionAdmin[]>(`/api/post/${postId}/quiz/admin`, { method: "GET" });
}

export async function submitPostQuiz(
    postId: number,
    body: QuizSubmitRequest
): Promise<QuizSubmitResult> {
    return apiFetchAuthed<QuizSubmitResult>(`/api/post/${postId}/quiz/submit`, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function getPostQuizAttempt(postId: number): Promise<QuizAttempt | null> {
    return apiFetchAuthed<QuizAttempt | null>(`/api/post/${postId}/quiz/attempt`, { method: "GET" });
}

export async function createQuizQuestion(body: QuizQuestionCreateRequest): Promise<number> {
    return apiFetchAuthed<number>("/api/post/quiz/question/create", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function updateQuizQuestion(
    id: number,
    body: QuizQuestionUpdateRequest
): Promise<void> {
    await apiFetchAuthed<void>(`/api/post/quiz/question/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
    });
}

export async function deleteQuizQuestion(id: number): Promise<void> {
    await apiFetchAuthed<void>(`/api/post/quiz/question/delete/${id}`, { method: "DELETE" });
}

export async function createQuizOption(body: QuizOptionCreateRequest): Promise<number> {
    return apiFetchAuthed<number>("/api/post/quiz/option/create", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export async function updateQuizOption(
    id: number,
    body: QuizOptionUpdateRequest
): Promise<void> {
    await apiFetchAuthed<void>(`/api/post/quiz/option/update/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
    });
}

export async function deleteQuizOption(id: number): Promise<void> {
    await apiFetchAuthed<void>(`/api/post/quiz/option/delete/${id}`, { method: "DELETE" });
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
    return apiFetchAuthed<ModulePostNav>(`/api/module/nav/by-post/${postId}${qs ? `?${qs}` : ""}`);
}
