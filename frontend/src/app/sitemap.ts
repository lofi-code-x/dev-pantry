import type { MetadataRoute } from "next";

type Post = {
    id: number;
    updated_at?: string;
};

type PostRequest = {
    query?: string;
    tag?: string;
    offset?: number;
    limit?: number;
};

const SITE_URL = "https://tryquestlab.ru";

async function searchPostsForSitemap(params: PostRequest): Promise<Post[]> {
    const sp = new URLSearchParams();

    if (params.query) sp.set("query", params.query);
    if (params.tag) sp.set("tag", params.tag);
    if (typeof params.offset === "number") sp.set("offset", String(params.offset));
    if (typeof params.limit === "number") sp.set("limit", String(params.limit));

    const qs = sp.toString();

    const apiBase = (
        process.env.NEXT_PUBLIC_API_BASE_URL || `${SITE_URL}/api`
    ).replace(/\/+$/, "");

    const url = `${apiBase}/post/search${qs ? `?${qs}` : ""}`;

    try {
        const res = await fetch(url, {
            cache: "no-store",
        });

        if (!res.ok) {
            console.error(`Sitemap: failed to fetch posts from ${url} (${res.status})`);
            return [];
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
            console.error("Sitemap: /post/search response is not an array");
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

    const posts = await searchPostsForSitemap({
        offset: 0,
        limit: 1000,
    });

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