import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = "https://tryquestlab.ru";
    const now = new Date();

    return [
        { url: `${baseUrl}/posts`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
        { url: `${baseUrl}/learn`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    ];
}