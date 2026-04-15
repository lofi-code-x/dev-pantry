import type {MetadataRoute} from "next";

type Post = {
    id: number;
    updated_at?: string;
};

const SITE_URL = "https://tryquestlab.ru";

async function getPosts(): Promise<Post[]> {
    const apiBase = (
        process.env.NEXT_PUBLIC_API_BASE_URL || `${SITE_URL}/api`
    ).replace(/\/+$/, "");

    try {
        const res = await fetch(`${apiBase}/posts`, {
            cache: "no-store",
        });

        if (!res.ok) {
            console.error(`Sitemap: failed to fetch posts (${res.status})`);
            return [];
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
            console.error("Sitemap: /posts response is not an array");
            return [];
        }

        return data;
    } catch (error) {
        console.error("Sitemap: error while fetching posts", error);
        return [];
    }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        {
            url: `${SITE_URL}/posts`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/learn`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.7,
        },
    ];

    const posts = await getPosts();

    const postPages: MetadataRoute.Sitemap = posts
        .filter((post) => post?.id !== undefined && post?.id !== null)
        .map((post) => ({
            url: `${SITE_URL}/posts/${post.id}`,
            lastModified: post.updated_at ? new Date(post.updated_at) : now,
            changeFrequency: "weekly" as const,
            priority: 0.7,
        }));

    return [...staticPages, ...postPages];
}