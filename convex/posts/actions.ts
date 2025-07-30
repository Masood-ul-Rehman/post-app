import { action } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";
import { link } from "fs";

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
            if (!post.content && !post.mediaUrls) {
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
                            mediaUrls: post.mediaUrls || [],
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
        mediaUrls: v.array(v.string()),
        link: v.optional(v.string()),
        accessToken: v.string(),
    },
    handler: async (_ctx, args): Promise<PlatformResult> => {
        try {
            let result;

            if (args.mediaUrls && args.mediaUrls.length > 0) {
                if (args.mediaUrls.length === 1) {
                    // Single media item - use direct posting
                    const mediaUrl = args.mediaUrls[0];
                    const isVideo = /\.(mp4|mov|avi|wmv|flv|webm)$/i.test(mediaUrl);

                    if (isVideo) {
                        // For videos, try with extended timeout and add additional parameters
                        const videoBody = {
                            url: mediaUrl,
                            description: args.message,
                            access_token: args.accessToken,
                            // Add video-specific parameters
                            published: true,
                            title: args.message?.substring(0, 100) || "Video Post"
                        };

                        console.log("[publishFacebook] /videos request body:", videoBody);

                        // Use longer timeout for video uploads
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

                        try {
                            const videoResponse = await fetch(
                                `https://graph.facebook.com/v18.0/${args.pageId}/videos`,
                                {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(videoBody),
                                    signal: controller.signal
                                }
                            );

                            clearTimeout(timeoutId);
                            result = await videoResponse.json();
                            console.log("[publishFacebook] /videos response:", result);

                            if (!videoResponse.ok || result.error) {
                                // If video upload fails, fall back to link post
                                console.log("[publishFacebook] Video upload failed, falling back to link post");
                                throw new Error("VIDEO_UPLOAD_FAILED");
                            }
                        } catch (error) {
                            clearTimeout(timeoutId);
                            if ((error as Error).message === "VIDEO_UPLOAD_FAILED" || (error as Error).name === 'AbortError') {
                                // Fallback: Post as a link with the video URL
                                console.log("[publishFacebook] Falling back to link post for video");
                                const linkBody = {
                                    message: `${args.message}\n\nVideo: ${mediaUrl}`,
                                    link: mediaUrl,
                                    access_token: args.accessToken,
                                };

                                const linkResponse = await fetch(
                                    `https://graph.facebook.com/v18.0/${args.pageId}/feed`,
                                    {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(linkBody),
                                    }
                                );

                                result = await linkResponse.json();
                                console.log("[publishFacebook] Link fallback response:", result);

                                if (!linkResponse.ok || result.error) {
                                    throw new Error(
                                        result.error?.message ||
                                        `HTTP ${linkResponse.status}: ${linkResponse.statusText}`
                                    );
                                }
                            } else {
                                throw error;
                            }
                        }
                    } else {
                        // Handle photos normally
                        const photoBody = {
                            url: mediaUrl,
                            caption: args.message,
                            access_token: args.accessToken,
                        };

                        console.log("[publishFacebook] /photos request body:", photoBody);

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
                    }
                } else {
                    // Multiple media items - use batch upload approach
                    const mediaIds = [];
                    const failedVideos = [];

                    // Step 1: Upload each media item and collect their IDs
                    for (const mediaUrl of args.mediaUrls) {
                        const isVideo = /\.(mp4|mov|avi|wmv|flv|webm)$/i.test(mediaUrl);

                        const uploadBody = {
                            url: mediaUrl,
                            published: false, // Don't publish immediately
                            access_token: args.accessToken,
                        };

                        console.log(
                            `[publishFacebook] Uploading ${isVideo ? 'video' : 'photo'}:`,
                            uploadBody
                        );

                        try {
                            // Use timeout for video uploads
                            const controller = new AbortController();
                            let timeoutId;
                            if (isVideo) {
                                timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
                            }

                            const uploadResponse = await fetch(
                                `https://graph.facebook.com/v18.0/${args.pageId}/${isVideo ? 'videos' : 'photos'}`,
                                {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify(uploadBody),
                                    signal: isVideo ? controller.signal : undefined
                                }
                            );

                            if (timeoutId) clearTimeout(timeoutId);

                            const uploadResult = await uploadResponse.json();
                            console.log(`[publishFacebook] Upload ${isVideo ? 'video' : 'photo'} response:`, uploadResult);

                            if (!uploadResponse.ok || uploadResult.error) {
                                if (isVideo) {
                                    // Track failed videos for fallback
                                    console.log(`[publishFacebook] Video upload failed, will include as link: ${mediaUrl}`);
                                    failedVideos.push(mediaUrl);
                                    continue; // Skip adding to mediaIds, continue with next media
                                } else {
                                    throw new Error(
                                        uploadResult.error?.message ||
                                        `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`
                                    );
                                }
                            }

                            // Add media ID to collection
                            mediaIds.push({
                                media_fbid: uploadResult.id
                            });

                        } catch (error) {
                            if (isVideo && ((error as Error).name === 'AbortError' || (error as Error).message.includes('video'))) {
                                // Video timeout or upload error - add to failed videos
                                console.log(`[publishFacebook] Video upload timeout/error, will include as link: ${mediaUrl}`);
                                failedVideos.push(mediaUrl);
                                continue;
                            } else {
                                throw error;
                            }
                        }
                    }

                    // Step 2: Create a single post with all media items
                    let finalMessage = args.message;

                    // If there are failed videos, add them as links in the message
                    if (failedVideos.length > 0) {
                        const videoLinks = failedVideos.map(url => `Video: ${url}`).join('\n');
                        finalMessage = `${args.message}\n\n${videoLinks}`;
                    }

                    const postBody: any = {
                        message: finalMessage,
                        access_token: args.accessToken,
                        link: '',
                    };

                    // Only add attached_media if we have successful uploads
                    if (mediaIds.length > 0) {
                        postBody.attached_media = mediaIds;
                    }

                    if (args.link) {
                        postBody.link = args.link;
                    }

                    console.log("[publishFacebook] Creating multi-media post:", postBody);

                    const postResponse = await fetch(
                        `https://graph.facebook.com/v18.0/${args.pageId}/feed`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(postBody),
                        }
                    );

                    result = await postResponse.json();
                    console.log("[publishFacebook] Multi-media post response:", result);

                    if (!postResponse.ok || result.error) {
                        throw new Error(
                            result.error?.message ||
                            `HTTP ${postResponse.status}: ${postResponse.statusText}`
                        );
                    }
                }
            } else {
                // No media - text-only post to /feed endpoint
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
    // handler: async (_ctx, args): Promise<PlatformResult> => {
    //     try {
    //         let result;

    //         if (args.mediaUrls && args.mediaUrls.length > 0) {
    //             if (args.mediaUrls.length === 1) {
    //                 // Single media item - use direct posting
    //                 const mediaUrl = args.mediaUrls[0];
    //                 const isVideo = /\.(mp4|mov|avi|wmv|flv|webm)$/i.test(mediaUrl);

    //                 if (isVideo) {
    //                     // For videos, try with extended timeout and add additional parameters
    //                     const videoBody = {
    //                         url: mediaUrl,
    //                         description: args.message,
    //                         access_token: args.accessToken,
    //                         // Add video-specific parameters
    //                         published: true,
    //                         title: args.message?.substring(0, 100) || "Video Post"
    //                     };

    //                     console.log("[publishFacebook] /videos request body:", videoBody);

    //                     // Use longer timeout for video uploads
    //                     const controller = new AbortController();
    //                     const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    //                     try {
    //                         const videoResponse = await fetch(
    //                             `https://graph.facebook.com/v18.0/${args.pageId}/videos`,
    //                             {
    //                                 method: "POST",
    //                                 headers: { "Content-Type": "application/json" },
    //                                 body: JSON.stringify(videoBody),
    //                                 signal: controller.signal
    //                             }
    //                         );

    //                         clearTimeout(timeoutId);
    //                         result = await videoResponse.json();
    //                         console.log("[publishFacebook] /videos response:", result);

    //                         if (!videoResponse.ok || result.error) {
    //                             // If video upload fails, fall back to link post
    //                             console.log("[publishFacebook] Video upload failed, falling back to link post");
    //                             throw new Error("VIDEO_UPLOAD_FAILED");
    //                         }
    //                     } catch (error) {
    //                         clearTimeout(timeoutId);
    //                         if ((error as Error).message === "VIDEO_UPLOAD_FAILED" || (error as Error).name === 'AbortError') {
    //                             // Fallback: Post as a link with the video URL
    //                             console.log("[publishFacebook] Falling back to link post for video");
    //                             const linkBody = {
    //                                 message: `${args.message}\n\nVideo: ${mediaUrl}`,
    //                                 link: mediaUrl,
    //                                 access_token: args.accessToken,
    //                             };

    //                             const linkResponse = await fetch(
    //                                 `https://graph.facebook.com/v18.0/${args.pageId}/feed`,
    //                                 {
    //                                     method: "POST",
    //                                     headers: { "Content-Type": "application/json" },
    //                                     body: JSON.stringify(linkBody),
    //                                 }
    //                             );

    //                             result = await linkResponse.json();
    //                             console.log("[publishFacebook] Link fallback response:", result);

    //                             if (!linkResponse.ok || result.error) {
    //                                 throw new Error(
    //                                     result.error?.message ||
    //                                     `HTTP ${linkResponse.status}: ${linkResponse.statusText}`
    //                                 );
    //                             }
    //                         } else {
    //                             throw error;
    //                         }
    //                     }
    //                 } else {
    //                     // Handle photos normally
    //                     const photoBody = {
    //                         url: mediaUrl,
    //                         caption: args.message,
    //                         access_token: args.accessToken,
    //                     };

    //                     console.log("[publishFacebook] /photos request body:", photoBody);

    //                     const photoResponse = await fetch(
    //                         `https://graph.facebook.com/v18.0/${args.pageId}/photos`,
    //                         {
    //                             method: "POST",
    //                             headers: { "Content-Type": "application/json" },
    //                             body: JSON.stringify(photoBody),
    //                         }
    //                     );

    //                     result = await photoResponse.json();
    //                     console.log("[publishFacebook] /photos response:", result);

    //                     if (!photoResponse.ok || result.error) {
    //                         throw new Error(
    //                             result.error?.message ||
    //                             `HTTP ${photoResponse.status}: ${photoResponse.statusText}`
    //                         );
    //                     }
    //                 }
    //             } else {
    //                 // Multiple media items - use batch upload approach
    //                 const mediaIds = [];

    //                 // Step 1: Upload each media item and collect their IDs
    //                 for (const mediaUrl of args.mediaUrls) {
    //                     const isVideo = /\.(mp4|mov|avi|wmv|flv|webm)$/i.test(mediaUrl);

    //                     const uploadBody = {
    //                         url: mediaUrl,
    //                         published: false, // Don't publish immediately
    //                         access_token: args.accessToken,
    //                     };

    //                     console.log(
    //                         `[publishFacebook] Uploading ${isVideo ? 'video' : 'photo'}:`,
    //                         uploadBody
    //                     );

    //                     const uploadResponse = await fetch(
    //                         `https://graph.facebook.com/v18.0/${args.pageId}/${isVideo ? 'videos' : 'photos'}`,
    //                         {
    //                             method: "POST",
    //                             headers: { "Content-Type": "application/json" },
    //                             body: JSON.stringify(uploadBody),
    //                         }
    //                     );

    //                     const uploadResult = await uploadResponse.json();
    //                     console.log(`[publishFacebook] Upload ${isVideo ? 'video' : 'photo'} response:`, uploadResult);

    //                     if (!uploadResponse.ok || uploadResult.error) {
    //                         throw new Error(
    //                             uploadResult.error?.message ||
    //                             `HTTP ${uploadResponse.status}: ${uploadResponse.statusText}`
    //                         );
    //                     }

    //                     // Add media ID to collection
    //                     mediaIds.push({
    //                         media_fbid: uploadResult.id
    //                     });
    //                 }

    //                 // Step 2: Create a single post with all media items
    //                 const postBody = {
    //                     message: args.message,
    //                     attached_media: mediaIds,
    //                     access_token: args.accessToken,
    //                     link: ''
    //                 };

    //                 if (args.link) {
    //                     postBody.link = args.link;
    //                 }

    //                 console.log("[publishFacebook] Creating multi-media post:", postBody);

    //                 const postResponse = await fetch(
    //                     `https://graph.facebook.com/v18.0/${args.pageId}/feed`,
    //                     {
    //                         method: "POST",
    //                         headers: { "Content-Type": "application/json" },
    //                         body: JSON.stringify(postBody),
    //                     }
    //                 );

    //                 result = await postResponse.json();
    //                 console.log("[publishFacebook] Multi-media post response:", result);

    //                 if (!postResponse.ok || result.error) {
    //                     throw new Error(
    //                         result.error?.message ||
    //                         `HTTP ${postResponse.status}: ${postResponse.statusText}`
    //                     );
    //                 }
    //             }
    //         } else {
    //             // No media - text-only post to /feed endpoint
    //             const feedBody: Record<string, string> = {
    //                 message: args.message,
    //                 access_token: args.accessToken,
    //             };

    //             if (args.link) {
    //                 feedBody.link = args.link;
    //             }

    //             console.log("[publishFacebook] /feed request body:", feedBody);

    //             const feedResponse = await fetch(
    //                 `https://graph.facebook.com/v18.0/${args.pageId}/feed`,
    //                 {
    //                     method: "POST",
    //                     headers: { "Content-Type": "application/json" },
    //                     body: JSON.stringify(feedBody),
    //                 }
    //             );

    //             result = await feedResponse.json();
    //             console.log("[publishFacebook] /feed response:", result);

    //             if (!feedResponse.ok || result.error) {
    //                 throw new Error(
    //                     result.error?.message ||
    //                     `HTTP ${feedResponse.status}: ${feedResponse.statusText}`
    //                 );
    //             }
    //         }

    //         return {
    //             success: true,
    //             platformPostId: result.id,
    //         };
    //     } catch (error) {
    //         console.error("[publishFacebook] Error:", error);
    //         return {
    //             success: false,
    //             error:
    //                 error instanceof Error
    //                     ? error.message
    //                     : "Facebook publish failed",
    //         };
    //     }
    // },
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
