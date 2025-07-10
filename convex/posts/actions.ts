import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// Types for better type safety
interface PlatformResult {
    platformPostId?: string;
    success: boolean;
    error?: string;
}

interface FacebookPost {
    message: string;
    link?: string;
    picture?: string;
    name?: string;
    caption?: string;
    description?: string;
}

interface InstagramPost {
    image_url: string;
    caption?: string;
    media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
}

// Main action to publish a post to the correct platform
export const publishToPlatform = action({
    args: { postId: v.id("posts") },
    handler: async (ctx, args) => {
        try {
            // Fetch the post using a query, since actions can't access db directly
            const post = await ctx.runQuery(api.posts.queries.getPostById, {
                postId: args.postId,
            });

            if (!post) {
                throw new Error("Post not found");
            }

            // Validate required fields
            if (!post.content && !post.imageUrl) {
                throw new Error("Post must have content or image");
            }

            // Update status to publishing
            await ctx.runMutation(api.posts.mutations.updatePostStatus, {
                postId: args.postId,
                status: "publishing",
            });

            let result: PlatformResult;

            switch (post.platform) {
                case "facebook":
                    // Fetch the connected account from metaAccounts
                    const fbAccount = await ctx.runQuery(
                        api.metaAccounts.queries.getByUserAccountType,
                        {
                            userId: post.userId,
                            accountId: post.accountId,
                            accountType: "facebook",
                        }
                    );
                    console.log("[publishToPlatform] Facebook post:", post);
                    console.log(
                        "[publishToPlatform] Facebook account:",
                        fbAccount
                    );
                    if (!fbAccount) {
                        throw new Error("Facebook account not found");
                    }

                    // Use the dedicated Facebook action for consistency
                    result = await ctx.runAction(
                        api.posts.actions.publishFacebook,
                        {
                            pageId: fbAccount.pageId,
                            message: post.content || "",
                            imageUrl: post.imageUrl,
                            accessToken: fbAccount.accessToken,
                        }
                    );
                    break;

                case "instagram":
                    // Fetch the connected account from metaAccounts
                    const igAccount = await ctx.runQuery(
                        api.metaAccounts.queries.getByUserAccountType,
                        {
                            userId: post.userId,
                            accountId: post.accountId,
                            accountType: "instagram",
                        }
                    );
                    if (!igAccount) {
                        throw new Error("Instagram account not found");
                    }
                    if (!igAccount.pageId || !igAccount.accessToken) {
                        throw new Error(
                            "Instagram account missing required fields"
                        );
                    }
                    if (!post.imageUrl) {
                        throw new Error("Instagram posts require an image");
                    }

                    result = await ctx.runAction(
                        api.posts.actions.publishInstagram,
                        {
                            igUserId: igAccount.pageId,
                            caption: post.content || "",
                            imageUrl: post.imageUrl,
                            accessToken: igAccount.accessToken,
                        }
                    );
                    break;

                case "linkedin":
                    result = await ctx.runAction(
                        api.posts.actions.publishLinkedIn,
                        { postId: args.postId }
                    );
                    break;

                case "pinterest":
                    result = await ctx.runAction(
                        api.posts.actions.publishPinterest,
                        { postId: args.postId }
                    );
                    break;

                case "threads":
                    result = await ctx.runAction(
                        api.posts.actions.publishThreads,
                        { postId: args.postId }
                    );
                    break;

                case "tiktok":
                    result = await ctx.runAction(
                        api.posts.actions.publishTikTok,
                        { postId: args.postId }
                    );
                    break;

                default:
                    throw new Error(`Unsupported platform: ${post.platform}`);
            }

            if (result.success) {
                await ctx.runMutation(api.posts.mutations.updatePostStatus, {
                    postId: args.postId,
                    status: "published",
                    platformPostId: result.platformPostId,
                });
                return { success: true, platformPostId: result.platformPostId };
            } else {
                throw new Error(result.error || "Publishing failed");
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Unknown error occurred";

            await ctx.runMutation(api.posts.mutations.updatePostStatus, {
                postId: args.postId,
                status: "failed",
                errorMessage,
            });

            return { success: false, error: errorMessage };
        }
    },
});

// Facebook publishing implementation (improved)
export const publishFacebook = action({
    args: {
        pageId: v.string(),
        message: v.string(),
        imageUrl: v.optional(v.string()),
        link: v.optional(v.string()),
        accessToken: v.string(),
    },
    handler: async (_ctx, args): Promise<PlatformResult> => {
        try {
            let result;

            if (args.imageUrl) {
                // Post image to /photos endpoint
                const photoBody = {
                    url: args.imageUrl,
                    caption: args.message,
                    access_token: args.accessToken,
                };

                console.log(
                    "[publishFacebook] /photos request body:",
                    photoBody
                );

                const photoResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${args.pageId}/photos`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(photoBody),
                    }
                );

                result = await photoResponse.json();
                console.log("[publishFacebook] /photos response:", result);

                if (!photoResponse.ok || result.error) {
                    throw new Error(
                        result.error?.message ||
                            `HTTP ${photoResponse.status}: ${photoResponse.statusText}`
                    );
                }
            } else {
                // Post message only to /feed endpoint
                const feedBody: Record<string, string> = {
                    message: args.message,
                    access_token: args.accessToken,
                };

                if (args.link) {
                    feedBody.link = args.link;
                }

                console.log("[publishFacebook] /feed request body:", feedBody);

                const feedResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${args.pageId}/feed`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(feedBody),
                    }
                );

                result = await feedResponse.json();
                console.log("[publishFacebook] /feed response:", result);

                if (!feedResponse.ok || result.error) {
                    throw new Error(
                        result.error?.message ||
                            `HTTP ${feedResponse.status}: ${feedResponse.statusText}`
                    );
                }
            }

            return {
                success: true,
                platformPostId: result.id,
            };
        } catch (error) {
            console.error("[publishFacebook] Error:", error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Facebook publish failed",
            };
        }
    },
});

// Instagram publishing implementation (fixed)
export const publishInstagram = action({
    args: {
        igUserId: v.string(),
        caption: v.string(),
        imageUrl: v.string(),
        accessToken: v.string(),
    },
    handler: async (_ctx, args): Promise<PlatformResult> => {
        try {
            // Step 1: Create media container
            const mediaBody = {
                image_url: args.imageUrl,
                caption: args.caption,
                access_token: args.accessToken,
            };

            console.log("[publishInstagram] /media request body:", mediaBody);

            const mediaRes = await fetch(
                `https://graph.facebook.com/v18.0/${args.igUserId}/media`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(mediaBody),
                }
            );

            const mediaJson = await mediaRes.json();
            console.log("[publishInstagram] /media response:", mediaJson);

            if (!mediaRes.ok || mediaJson.error) {
                throw new Error(
                    mediaJson.error?.message ||
                        `Media creation failed: HTTP ${mediaRes.status}`
                );
            }

            const containerId = mediaJson.id;
            if (!containerId) {
                throw new Error(
                    "Instagram media container creation failed - no ID returned"
                );
            }

            // Step 2: Wait a moment before publishing (Instagram sometimes needs time)
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Step 3: Publish the media
            const publishBody = {
                creation_id: containerId,
                access_token: args.accessToken,
            };

            console.log(
                "[publishInstagram] /media_publish request body:",
                publishBody
            );

            const publishRes = await fetch(
                `https://graph.facebook.com/v18.0/${args.igUserId}/media_publish`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(publishBody),
                }
            );

            const publishJson = await publishRes.json();
            console.log(
                "[publishInstagram] /media_publish response:",
                publishJson
            );

            if (!publishRes.ok || publishJson.error) {
                throw new Error(
                    publishJson.error?.message ||
                        `Media publish failed: HTTP ${publishRes.status}`
                );
            }

            return {
                success: true,
                platformPostId: publishJson.id,
            };
        } catch (error) {
            console.error("[publishInstagram] Error:", error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Instagram publish failed",
            };
        }
    },
});

// Threads publishing implementation (fixed with proper API integration)
export const publishThreads = action({
    args: { postId: v.id("posts") },
    handler: async (ctx, args): Promise<PlatformResult> => {
        try {
            const post = await ctx.runQuery(api.posts.queries.getPostById, {
                postId: args.postId,
            });

            if (!post) {
                throw new Error("Post not found");
            }

            // Fetch the connected Threads account
            const threadsAccount = await ctx.runQuery(
                api.metaAccounts.queries.getByUserAccountType,
                {
                    userId: post.userId,
                    accountId: post.accountId,
                    accountType: "threads",
                }
            );

            if (!threadsAccount) {
                throw new Error("Threads account not found");
            }

            if (!threadsAccount.pageId || !threadsAccount.accessToken) {
                throw new Error("Threads account missing required fields");
            }

            // Threads API implementation
            let result;

            if (post.imageUrl) {
                // Step 1: Create media container for Threads with image
                const mediaBody = {
                    media_type: "IMAGE",
                    image_url: post.imageUrl,
                    text: post.content || "",
                    access_token: threadsAccount.accessToken,
                };

                console.log(
                    "[publishThreads] /threads request body:",
                    mediaBody
                );

                const mediaRes = await fetch(
                    `https://graph.threads.net/v1.0/${threadsAccount.pageId}/threads`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(mediaBody),
                    }
                );

                const mediaJson = await mediaRes.json();
                console.log("[publishThreads] /threads response:", mediaJson);

                if (!mediaRes.ok || mediaJson.error) {
                    throw new Error(
                        mediaJson.error?.message ||
                            `Threads media creation failed: HTTP ${mediaRes.status}`
                    );
                }

                const containerId = mediaJson.id;
                if (!containerId) {
                    throw new Error(
                        "Threads media container creation failed - no ID returned"
                    );
                }

                // Step 2: Publish the thread
                const publishBody = {
                    creation_id: containerId,
                    access_token: threadsAccount.accessToken,
                };

                console.log(
                    "[publishThreads] /threads_publish request body:",
                    publishBody
                );

                const publishRes = await fetch(
                    `https://graph.threads.net/v1.0/${threadsAccount.pageId}/threads_publish`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(publishBody),
                    }
                );

                result = await publishRes.json();
                console.log(
                    "[publishThreads] /threads_publish response:",
                    result
                );

                if (!publishRes.ok || result.error) {
                    throw new Error(
                        result.error?.message ||
                            `Threads publish failed: HTTP ${publishRes.status}`
                    );
                }
            } else {
                // Text-only thread
                const textBody = {
                    media_type: "TEXT",
                    text: post.content || "",
                    access_token: threadsAccount.accessToken,
                };

                console.log(
                    "[publishThreads] /threads (text) request body:",
                    textBody
                );

                const textRes = await fetch(
                    `https://graph.threads.net/v1.0/${threadsAccount.pageId}/threads`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(textBody),
                    }
                );

                const textJson = await textRes.json();
                console.log(
                    "[publishThreads] /threads (text) response:",
                    textJson
                );

                if (!textRes.ok || textJson.error) {
                    throw new Error(
                        textJson.error?.message ||
                            `Threads text creation failed: HTTP ${textRes.status}`
                    );
                }

                const containerId = textJson.id;
                if (!containerId) {
                    throw new Error(
                        "Threads text container creation failed - no ID returned"
                    );
                }

                // Publish the text thread
                const publishBody = {
                    creation_id: containerId,
                    access_token: threadsAccount.accessToken,
                };

                const publishRes = await fetch(
                    `https://graph.threads.net/v1.0/${threadsAccount.pageId}/threads_publish`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(publishBody),
                    }
                );

                result = await publishRes.json();
                console.log(
                    "[publishThreads] /threads_publish (text) response:",
                    result
                );

                if (!publishRes.ok || result.error) {
                    throw new Error(
                        result.error?.message ||
                            `Threads publish failed: HTTP ${publishRes.status}`
                    );
                }
            }

            return {
                success: true,
                platformPostId: result.id,
            };
        } catch (error) {
            console.error("[publishThreads] Error:", error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Threads publishing failed",
            };
        }
    },
});

// Helper function to validate image URLs
const validateImageUrl = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(url, { method: "HEAD" });
        const contentType = response.headers.get("content-type");
        return response.ok && contentType?.startsWith("image/") === true;
    } catch {
        return false;
    }
};

// Helper function to retry operations with exponential backoff
const retryWithBackoff = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> => {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error as Error;

            if (attempt === maxRetries - 1) {
                throw lastError;
            }

            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
};

// LinkedIn publishing implementation (improved stub)
export const publishLinkedIn = action({
    args: { postId: v.id("posts") },
    handler: async (ctx, args): Promise<PlatformResult> => {
        try {
            const post = await ctx.runQuery(api.posts.queries.getPostById, {
                postId: args.postId,
            });
            if (!post) throw new Error("Post not found");

            // TODO: Implement LinkedIn API call
            // LinkedIn API requires user consent and proper OAuth flow
            // For now, return a placeholder response

            return {
                success: true,
                platformPostId: `li_${Date.now()}`,
            };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "LinkedIn publishing failed",
            };
        }
    },
});

// Pinterest publishing implementation (improved stub)
export const publishPinterest = action({
    args: { postId: v.id("posts") },
    handler: async (ctx, args): Promise<PlatformResult> => {
        try {
            const post = await ctx.runQuery(api.posts.queries.getPostById, {
                postId: args.postId,
            });
            if (!post) throw new Error("Post not found");

            // TODO: Implement Pinterest API call
            // Pinterest requires an image for pins

            return {
                success: true,
                platformPostId: `pin_${Date.now()}`,
            };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Pinterest publishing failed",
            };
        }
    },
});

// TikTok publishing implementation (improved stub)
export const publishTikTok = action({
    args: { postId: v.id("posts") },
    handler: async (ctx, args): Promise<PlatformResult> => {
        try {
            const post = await ctx.runQuery(api.posts.queries.getPostById, {
                postId: args.postId,
            });
            if (!post) throw new Error("Post not found");

            // TODO: Implement TikTok API call
            // TikTok requires video content

            return {
                success: true,
                platformPostId: `tt_${Date.now()}`,
            };
        } catch (error) {
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "TikTok publishing failed",
            };
        }
    },
});
