import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// Create a new post and trigger platform publishing if needed
export const createPost = mutation({
    args: {
        userId: v.string(),
        platform: v.union(
            v.literal("facebook"),
            v.literal("instagram"),
            v.literal("threads"),
            v.literal("pinterest"),
            v.literal("linkedin"),
            v.literal("tiktok")
        ),
        accountId: v.string(),
        content: v.string(),
        imageUrl: v.optional(v.string()),
        scheduledFor: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const status = args.scheduledFor ? "scheduled" : "published";
        const now = Date.now();
        const postId = await ctx.db.insert("posts", {
            userId: args.userId,
            platform: args.platform,
            accountId: args.accountId,
            content: args.content,
            imageUrl: args.imageUrl,
            status,
            scheduledFor: args.scheduledFor,
            publishedAt: args.scheduledFor ? undefined : now,
        });
        // If not scheduled, trigger publish action
        if (!args.scheduledFor) {
            await ctx.scheduler.runAfter(
                0,
                api.posts.actions.publishToPlatform,
                { postId }
            );
        }
        return postId;
    },
});

export const updatePostStatus = mutation({
    args: {
        postId: v.id("posts"),
        status: v.union(
            v.literal("draft"),
            v.literal("scheduled"),
            v.literal("publishing"),
            v.literal("published"),
            v.literal("failed")
        ),
        platformPostId: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.postId, {
            status: args.status,
            platformPostId: args.platformPostId,
            errorMessage: args.errorMessage,
            publishedAt: args.status === "published" ? Date.now() : undefined,
        });
    },
});

export const deletePost = mutation({
    args: { postId: v.id("posts") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.postId);
    },
});
