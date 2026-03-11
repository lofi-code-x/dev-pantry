import type { MetadataRoute } from "next";

type Post = {
    id: number;
    updated_at?: string;
};

async function getPosts(): Promise<Post[]> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts`, {
        cache: "no-store",
    });

    if (!res.ok) {
        return [];
    }

    return res.json();
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = "https://tryquestlab.ru";
    const now = new Date();

    const staticPages: MetadataRoute.Sitemap = [
        {
            url: `${baseUrl}/posts`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/learn`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.7,
        },
    ];

    const posts = await getPosts();

    const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
        url: `${baseUrl}/posts/${post.id}`,
        lastModified: post.updated_at ? new Date(post.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    return [...staticPages, ...postPages];
}