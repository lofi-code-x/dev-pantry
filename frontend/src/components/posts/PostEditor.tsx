// src/components/posts/PostEditor.tsx
"use client";

import React, {useEffect, useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import MdEditor from "@/components/posts/MdEditor";
import {useAuth} from "@/components/auth/AuthProvider";
import {ApiError} from "@/lib/apiClient";
import {
    createPost,
    suggestPost,
    updatePost,
    getPostQuizAdmin,
    createQuizQuestion,
    createQuizOption,
    deleteQuizQuestion,
    type PostCreateRequest,
    type QuizQuestionAdmin,
    type QuizQuestionType,
    type QuizTextInputValidation,
} from "@/lib/api/posts";
import UploadImagesPanel, {type UploadedImage} from "@/components/posts/UploadImagesPanel";
import {getAllCategories} from "@/lib/api/category";
import {getPostImages} from "@/lib/api/uploads";

// ✅ Icons (MUI)
import PublishIcon from "@mui/icons-material/Publish";
import SendIcon from "@mui/icons-material/Send";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import LightbulbOutlineIcon from "@mui/icons-material/LightbulbOutline";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

type Mode = "create" | "suggest" | "edit";

const STAFF_ROLES = ["admin", "moderator", "editor"] as const;

type Category = {
    tag: string;
    title: string;
};

function cn(...parts: Array<string | false | null | undefined>) {
    return parts.filter(Boolean).join(" ");
}

function isStaff(role: unknown) {
    return (STAFF_ROLES as readonly string[]).includes(String(role).toLowerCase());
}

const cardBase = "card-gloss ring-1 ring-inset ring-border";

type QuizOptionDraft = {
    id?: number;
    text: string;
    is_correct: boolean;
};

type QuizTextValidationDraft = {
    correct_answer: string;
};

type QuizQuestionDraft = {
    id?: number;
    text: string;
    question_type: QuizQuestionType;
    text_validation: QuizTextValidationDraft;
    options: QuizOptionDraft[];
};

function makeTextValidationDraft(
    source?: QuizTextInputValidation | null
): QuizTextValidationDraft {
    return {
        correct_answer: String(source?.correct_answer ?? ""),
    };
}

function buildTextValidationPayload(
    draft: QuizTextValidationDraft
): QuizTextInputValidation {
    return {
        correct_answer: draft.correct_answer.trim(),
    };
}

function toAnswerHint(answer: string): string {
    const normalized = answer.trim().replace(/\s+/g, " ");
    return normalized
        .split("")
        .map((ch) => (ch === " " ? " " : "_"))
        .join("");
}

function makeQuizQuestion(): QuizQuestionDraft {
    return {
        text: "",
        question_type: "single_choice",
        text_validation: makeTextValidationDraft(),
        options: [
            { text: "", is_correct: true },
            { text: "", is_correct: false },
        ],
    };
}

export default function PostEditor({
                                       mode,
                                       postId,
                                       initial,
                                   }: {
    mode: Mode;
    postId?: number;
    initial?: Partial<PostCreateRequest> & { author?: string; category_tag?: string; content_markdown?: string };
}) {
    const router = useRouter();
    const {user} = useAuth();
    const canEditQuiz = isStaff(user?.role);

    const [title, setTitle] = useState(initial?.title ?? "");
    const [categoryTag, setCategoryTag] = useState(initial?.category_tag ?? "");
    const [content, setContent] = useState(initial?.content_markdown ?? "");

    const [categories, setCategories] = useState<Category[]>([]);
    const [catLoading, setCatLoading] = useState(false);

    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [images, setImages] = useState<UploadedImage[]>([]);
    const [quiz, setQuiz] = useState<QuizQuestionDraft[]>([]);
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizErr, setQuizErr] = useState<string | null>(null);
    const [loadedQuizIds, setLoadedQuizIds] = useState<number[]>([]);

    const canAccess = useMemo(() => {
        if (!user) return false;
        if (mode === "suggest") return true;
        return isStaff(user.role);
    }, [user, mode]);

    const heading = mode === "create" ? "New post" : mode === "suggest" ? "Suggest post" : "Edit post";

    const subtitle =
        mode === "create"
            ? "This post will be published immediately."
            : mode === "suggest"
                ? "Your suggestion will be saved as private and can be published after review."
                : "Update the post content.";

    const submitLabel = mode === "create" ? "Publish" : mode === "suggest" ? "Submit suggestion" : "Save changes";

    const submitIcon =
        mode === "create" ? (
            <PublishIcon sx={{fontSize: 18}} className="text-muted-fg"/>
        ) : mode === "suggest" ? (
            <SendIcon sx={{fontSize: 18}} className="text-muted-fg"/>
        ) : (
            <SaveIcon sx={{fontSize: 18}} className="text-muted-fg"/>
        );

    const headingIcon =
        mode === "suggest" ? (
            <LightbulbOutlineIcon sx={{fontSize: 18}} className="text-muted-fg"/>
        ) : (
            <EditIcon sx={{fontSize: 18}} className="text-muted-fg"/>
        );

    // Load categories
    useEffect(() => {
        let cancelled = false;

        async function load() {
            setCatLoading(true);
            try {
                const list = await getAllCategories();
                if (cancelled) return;

                const normalized = (list ?? []).map((c: { tag?: unknown; title?: unknown }) => ({
                    tag: String(c.tag ?? "").trim(),
                    title: String(c.title ?? c.tag ?? "").trim(),
                }));

                setCategories(normalized);

                if (!categoryTag && normalized.length) {
                    setCategoryTag(normalized[0].tag);
                }
            } catch {
                // best-effort
            } finally {
                if (!cancelled) setCatLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ✅ load attached images for edit mode
    useEffect(() => {
        let cancelled = false;

        async function loadImages() {
            if (mode !== "edit") return;
            if (typeof postId !== "number") return;

            try {
                const list = await getPostImages(postId); // -> [{id,url}]
                if (cancelled) return;

                const mapped: UploadedImage[] = (list ?? []).map((x) => ({
                    id: String(x.id),
                    url: String(x.url),
                    name: "image",
                }));

                setImages(mapped);
            } catch {
                // best-effort
            }
        }

        loadImages();
        return () => {
            cancelled = true;
        };
    }, [mode, postId]);

    useEffect(() => {
        let cancelled = false;

        async function loadQuiz() {
            if (mode !== "edit") return;
            if (typeof postId !== "number") return;
            if (!canEditQuiz) return;

            setQuizLoading(true);
            setQuizErr(null);
            try {
                const res: QuizQuestionAdmin[] = await getPostQuizAdmin(postId);
                if (cancelled) return;

                const mapped: QuizQuestionDraft[] = (res ?? []).map((q) => ({
                    id: q.id,
                    text: q.question_text,
                    question_type: q.question_type ?? "single_choice",
                    text_validation: makeTextValidationDraft(q.text_validation),
                    options: (q.options ?? []).map((o) => ({
                        id: o.id,
                        text: o.option_text,
                        is_correct: o.is_correct,
                    })),
                }));

                setQuiz(mapped);
                setLoadedQuizIds((res ?? []).map((q) => q.id));
            } catch (e) {
                if (cancelled) return;
                setQuizErr(e instanceof ApiError ? e.message : "Failed to load quiz.");
            } finally {
                if (!cancelled) setQuizLoading(false);
            }
        }

        loadQuiz();
        return () => {
            cancelled = true;
        };
    }, [mode, postId, canEditQuiz]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!user) return setError("Please log in.");
        if (!canAccess) return setError("You don't have permission.");
        if (mode === "edit" && typeof postId !== "number") return setError("Missing postId.");

        const body: PostCreateRequest = {
            title: title.trim(),
            category_tag: categoryTag.trim(),
            author: mode === "edit" ? (initial?.author?.trim() || user.login) : user.login,
            content_markdown: content,
            image_upload_ids: images.map((x) => x.id),
        };

        if (!body.title) return setError("Title is required.");
        if (!body.category_tag) return setError("Category is required.");
        if (!body.content_markdown.trim()) return setError("Content is required.");

        if (canEditQuiz) {
            const quizValidationError = validateQuiz(quiz);
            if (quizValidationError) return setError(quizValidationError);
        }

        setPending(true);
        try {
            let id: number;
            if (mode === "create") id = await createPost(body);
            else if (mode === "suggest") id = await suggestPost(body);
            else id = await updatePost(postId!, body);

            if (canEditQuiz) {
                await saveQuiz(id);
            }

            router.push(`/posts/${id}`);
            router.refresh();
        } catch (err) {
            if (err instanceof ApiError) setError(err.message);
            else setError("Request failed.");
        } finally {
            setPending(false);
        }
    }

    function validateQuiz(data: QuizQuestionDraft[]): string | null {
        for (let i = 0; i < data.length; i++) {
            const q = data[i];
            if (!q.text.trim()) return `Question ${i + 1} text is required.`;
            if (q.question_type === "single_choice") {
                if (q.options.length < 2) return `Question ${i + 1} must have at least 2 options.`;
                const correctCount = q.options.filter((o) => o.is_correct).length;
                if (correctCount !== 1) {
                    return `Question ${i + 1} must have exactly one correct option.`;
                }
                for (let j = 0; j < q.options.length; j++) {
                    if (!q.options[j].text.trim()) {
                        return `Option ${j + 1} in question ${i + 1} is empty.`;
                    }
                }
                continue;
            }

            const validation = buildTextValidationPayload(q.text_validation);
            if (!validation.correct_answer) {
                return `Question ${i + 1} (text input) must have a correct answer.`;
            }
        }
        return null;
    }

    async function saveQuiz(targetPostId: number) {
        if (quiz.length === 0) {
            if (loadedQuizIds.length > 0) {
                for (const qid of loadedQuizIds) {
                    await deleteQuizQuestion(qid);
                }
                setLoadedQuizIds([]);
            }
            return;
        }

        if (loadedQuizIds.length > 0) {
            for (const qid of loadedQuizIds) {
                await deleteQuizQuestion(qid);
            }
            setLoadedQuizIds([]);
        }

        for (let i = 0; i < quiz.length; i++) {
            const q = quiz[i];
            const questionId = await createQuizQuestion({
                post_id: targetPostId,
                question_text: q.text.trim(),
                sort_order: i,
                question_type: q.question_type,
                text_validation:
                    q.question_type === "text_input"
                        ? buildTextValidationPayload(q.text_validation)
                        : null,
            });

            if (q.question_type === "single_choice") {
                for (const opt of q.options) {
                    await createQuizOption({
                        question_id: questionId,
                        option_text: opt.text.trim(),
                        is_correct: opt.is_correct,
                    });
                }
            }
        }
    }

    if (!user) return null;

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10">
            <header className="mb-6">
                <div className="flex items-center gap-2">
          <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", cardBase, "p-0")}>
            {headingIcon}
          </span>
                    <h1 className="text-2xl font-semibold tracking-tight text-fg">{heading}</h1>
                </div>
                <p className="mt-2 text-sm text-muted-fg">{subtitle}</p>
            </header>

            {!canAccess ? (
                <section className={cn(cardBase, "p-6")}>
                    <div className="text-sm text-muted-fg">Access denied.</div>
                </section>
            ) : (
                <form onSubmit={onSubmit} className="grid gap-4">
                    <section className={cn(cardBase, "p-6")}>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                            <div className="lg:col-span-8">
                                <label className="block text-sm font-medium text-fg">Title</label>
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="input mt-2"
                                    placeholder="Post title"
                                    disabled={pending}
                                />
                            </div>

                            <div className="lg:col-span-4">
                                <label className="block text-sm font-medium text-fg">Category</label>
                                <select
                                    value={categoryTag}
                                    onChange={(e) => setCategoryTag(e.target.value)}
                                    disabled={pending || catLoading || categories.length === 0}
                                    className={cn("input mt-2", "disabled:cursor-not-allowed disabled:opacity-60")}
                                >
                                    {catLoading ? (
                                        <option value="">Loading categories…</option>
                                    ) : categories.length === 0 ? (
                                        <option value="">No categories</option>
                                    ) : (
                                        categories.map((c) => (
                                            <option key={c.tag} value={c.tag}>
                                                {c.title} ({c.tag})
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            <div className="lg:col-span-12">
                                <UploadImagesPanel disabled={pending} value={images} onChange={setImages}/>
                            </div>
                        </div>

                        {error ? (
                            <div
                                className={cn(
                                    "mt-5 rounded-xl border p-4 text-sm text-fg",
                                    "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                                    "ring-1 ring-inset ring-ring/15"
                                )}
                            >
                                {error}
                            </div>
                        ) : null}
                    </section>

                    <section className={cn("border border-border rounded-3xl", "p-3")}>
                        <MdEditor value={content} onChange={setContent}/>
                    </section>

                    {canEditQuiz ? (
                        <section className={cn(cardBase, "p-6")}>
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium text-fg">Quiz</div>
                                    <div className="text-xs text-muted-fg">Add questions and answers.</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setQuiz((prev) => [...prev, makeQuizQuestion()])}
                                    disabled={pending}
                                    className={cn("btn px-3 py-2 text-sm")}
                                >
                                    <AddIcon sx={{ fontSize: 18 }} className="text-muted-fg" />
                                    Add question
                                </button>
                            </div>

                            {quizErr ? (
                                <div
                                    className={cn(
                                        "mb-3 rounded-xl border p-3 text-sm text-fg",
                                        "border-[hsl(var(--ring)/0.35)] bg-[hsl(var(--ring)/0.06)]",
                                        "ring-1 ring-inset ring-ring/15"
                                    )}
                                >
                                    {quizErr}
                                </div>
                            ) : null}

                            {quizLoading ? (
                                <div className="text-sm text-muted-fg">Loading quiz…</div>
                            ) : quiz.length === 0 ? (
                                <div className="text-sm text-muted-fg">No questions yet.</div>
                            ) : (
                                <div className="space-y-4">
                                    {quiz.map((q, qi) => (
                                        <div
                                            key={`q-${qi}`}
                                            className={cn(
                                                "rounded-xl border p-4",
                                                "border-border bg-[hsl(var(--ring)/0.03)]"
                                            )}
                                        >
                                            <div className="mb-3 flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <label className="block text-xs text-muted-fg">
                                                        Question {qi + 1}
                                                    </label>
                                                    <input
                                                        value={q.text}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setQuiz((prev) =>
                                                                prev.map((x, idx) =>
                                                                    idx === qi ? { ...x, text: v } : x
                                                                )
                                                            );
                                                        }}
                                                        className="input mt-2"
                                                        placeholder="Question text"
                                                        disabled={pending}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setQuiz((prev) => prev.filter((_, idx) => idx !== qi))
                                                    }
                                                    disabled={pending}
                                                    className={cn("btn h-8 px-2 text-xs")}
                                                >
                                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} className="text-muted-fg" />
                                                    Remove
                                                </button>
                                            </div>

                                            <div className="mb-3">
                                                <label className="block text-xs text-muted-fg">Type</label>
                                                <select
                                                    value={q.question_type}
                                                    onChange={(e) => {
                                                        const value = e.target.value as QuizQuestionType;
                                                        setQuiz((prev) =>
                                                            prev.map((x, idx) => {
                                                                if (idx !== qi) return x;
                                                                if (value === "single_choice") {
                                                                    const baseOptions = x.options.length >= 2
                                                                        ? x.options
                                                                        : [
                                                                              { text: "", is_correct: true },
                                                                              { text: "", is_correct: false },
                                                                          ];
                                                                    const nextOptions = baseOptions.map((opt) => ({ ...opt }));
                                                                    if (!nextOptions.some((o) => o.is_correct)) {
                                                                        nextOptions[0] = {
                                                                            ...nextOptions[0],
                                                                            is_correct: true,
                                                                        };
                                                                    }
                                                                    return {
                                                                        ...x,
                                                                        question_type: value,
                                                                        options: nextOptions,
                                                                    };
                                                                }
                                                                return {
                                                                    ...x,
                                                                    question_type: value,
                                                                    options: [],
                                                                };
                                                            })
                                                        );
                                                    }}
                                                    className="input mt-2 max-w-xs"
                                                    disabled={pending}
                                                >
                                                    <option value="single_choice">single_choice</option>
                                                    <option value="text_input">text_input</option>
                                                </select>
                                            </div>

                                            {q.question_type === "single_choice" ? (
                                                <>
                                                    <div className="space-y-2">
                                                        {q.options.map((opt, oi) => (
                                                            <div key={`q-${qi}-o-${oi}`} className="flex items-center gap-2">
                                                                <input
                                                                    type="radio"
                                                                    name={`q-${qi}-correct`}
                                                                    checked={opt.is_correct}
                                                                    onChange={() => {
                                                                        setQuiz((prev) =>
                                                                            prev.map((x, idx) => {
                                                                                if (idx !== qi) return x;
                                                                                return {
                                                                                    ...x,
                                                                                    options: x.options.map((o, oidx) => ({
                                                                                        ...o,
                                                                                        is_correct: oidx === oi,
                                                                                    })),
                                                                                };
                                                                            })
                                                                        );
                                                                    }}
                                                                    disabled={pending}
                                                                />
                                                                <input
                                                                    value={opt.text}
                                                                    onChange={(e) => {
                                                                        const v = e.target.value;
                                                                        setQuiz((prev) =>
                                                                            prev.map((x, idx) => {
                                                                                if (idx !== qi) return x;
                                                                                return {
                                                                                    ...x,
                                                                                    options: x.options.map((o, oidx) =>
                                                                                        oidx === oi ? { ...o, text: v } : o
                                                                                    ),
                                                                                };
                                                                            })
                                                                        );
                                                                    }}
                                                                    className="input h-9 flex-1"
                                                                    placeholder={`Option ${oi + 1}`}
                                                                    disabled={pending}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setQuiz((prev) =>
                                                                            prev.map((x, idx) => {
                                                                                if (idx !== qi) return x;
                                                                                const next = x.options.filter((_, oidx) => oidx !== oi);
                                                                                if (!next.some((o) => o.is_correct) && next.length > 0) {
                                                                                    next[0] = { ...next[0], is_correct: true };
                                                                                }
                                                                                return { ...x, options: next };
                                                                            })
                                                                        );
                                                                    }}
                                                                    disabled={pending || q.options.length <= 2}
                                                                    className={cn("btn h-8 px-2 text-xs")}
                                                                >
                                                                    <DeleteOutlineIcon sx={{ fontSize: 16 }} className="text-muted-fg" />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="mt-3">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setQuiz((prev) =>
                                                                    prev.map((x, idx) =>
                                                                        idx === qi
                                                                            ? {
                                                                                ...x,
                                                                                options: [
                                                                                    ...x.options,
                                                                                    { text: "", is_correct: false },
                                                                                ],
                                                                            }
                                                                            : x
                                                                    )
                                                                )
                                                            }
                                                            disabled={pending}
                                                            className={cn("btn px-3 py-2 text-xs")}
                                                        >
                                                            <AddIcon sx={{ fontSize: 16 }} className="text-muted-fg" />
                                                            Add option
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="space-y-2">
                                                    <label className="block text-xs text-muted-fg">
                                                        Correct answer (exact, case-insensitive)
                                                    </label>
                                                    <input
                                                        value={q.text_validation.correct_answer}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setQuiz((prev) =>
                                                                prev.map((x, idx) =>
                                                                    idx === qi
                                                                        ? {
                                                                            ...x,
                                                                            text_validation: {
                                                                                ...x.text_validation,
                                                                                correct_answer: v,
                                                                            },
                                                                        }
                                                                        : x
                                                                )
                                                            );
                                                        }}
                                                        className="input h-9 w-full"
                                                        placeholder="e.g. Сетевые технологии"
                                                        disabled={pending}
                                                    />
                                                    <div className="text-xs text-muted-fg">
                                                        Hint preview:{" "}
                                                        <span className="font-mono">
                                                            {toAnswerHint(q.text_validation.correct_answer) || "_____"}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    ) : null}

                    <div className="flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={pending}
                            className={cn(
                                "btn px-4 py-2",
                                "disabled:cursor-not-allowed disabled:opacity-60"
                            )}
                        >
                            {submitIcon}
                            {pending ? "Saving..." : submitLabel}
                        </button>
                    </div>
                </form>
            )}
        </main>
    );
}
