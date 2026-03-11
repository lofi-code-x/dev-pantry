import type { Metadata } from "next";
import PostPageClient from "./PostPageClient";
import { getPost } from "@/lib/api/posts";

type PageProps = {
    params: Promise<{ id: string }>;
};

function buildDescription(post: {
    preview_text?: string | null;
    content_markdown?: string | null;
}) {
    if (post.preview_text?.trim()) {
        return post.preview_text.trim();
    }

    if (post.content_markdown?.trim()) {
        return post.content_markdown
            .replace(/[#>*_`~-]/g, " ")
            .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 160);
    }

    return "QuestLab post";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params;
    const postId = Number(id);

    if (!Number.isFinite(postId)) {
        return {
            title: "Post",
            description: "QuestLab post",
        };
    }

    try {
        const post = await getPost(postId);

        const title = post.title ?? "Post";
        const description = buildDescription(post);

        return {
            title,
            description,
            alternates: {
                canonical: `https://tryquestlab.ru/posts/${postId}`,
            },
            openGraph: {
                title,
                description,
                url: `https://tryquestlab.ru/posts/${postId}`,
                type: "article",
            },
            twitter: {
                card: "summary_large_image",
                title,
                description,
            },
        };
    } catch {
        return {
            title: "Post",
            description: "QuestLab post",
        };
    }
}

export default function Page() {
    return <PostPageClient />;
}