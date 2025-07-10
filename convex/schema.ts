import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        userId: v.string(),
        name: v.optional(v.string()),
        email: v.string(),
        createdAt: v.optional(v.number()),
    })
        .index("by_email", ["email"])
        .index("by_userId", ["userId"]),

    userAccounts: defineTable({
        userId: v.string(),
        metaAccounts: v.optional(v.array(v.string())),
        tiktokAccounts: v.optional(
            v.array(
                v.object({
                    openId: v.string(),
                    linkedAt: v.number(),
                })
            )
        ),
        linkedinAccounts: v.optional(v.array(v.string())),
        twitterAccounts: v.optional(v.array(v.string())),
        youtubeAccounts: v.optional(v.array(v.string())),
    }).index("by_user", ["userId"]),

    metaAccounts: defineTable({
        userId: v.string(),
        pageId: v.string(),
        userAccountId: v.string(),
        accountName: v.string(),
        accountType: v.string(),
        pagePermissions: v.optional(v.array(v.string())),
        accessToken: v.string(),
        username: v.optional(v.string()),
        instagramAccount: v.optional(
            v.object({
                id: v.string(),
                username: v.string(),
                name: v.string(),
                profile_picture_url: v.optional(v.string()),
            })
        ),
        igBusinessId: v.optional(v.string()),
        createdAt: v.optional(v.number()),
    }),

    linkedinAccounts: defineTable({
        userId: v.string(),
        userAccountId: v.string(),
        accountName: v.string(),
        accountType: v.string(),
        accessToken: v.string(),
        createdAt: v.optional(v.number()),
    }),

    tiktokAccounts: defineTable({
        userId: v.string(),
        openId: v.string(),
        accessToken: v.string(),
        refreshToken: v.string(),
        expiresIn: v.number(),
        createdAt: v.optional(v.number()),
    })
        .index("by_userId", ["userId"])
        .index("by_openId", ["openId"]),

    pinterestAccounts: defineTable({
        userId: v.string(),
        userAccountId: v.string(),
        accountName: v.string(),
        accountType: v.string(),
        accessToken: v.string(),
        username: v.optional(v.string()),
        refreshToken: v.optional(v.string()),
        expiresIn: v.optional(v.number()),
        createdAt: v.optional(v.number()),
    })
        .index("by_userId", ["userId"])
        .index("by_userAccountId", ["userAccountId"]),

    posts: defineTable({
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
        status: v.union(
            v.literal("draft"),
            v.literal("scheduled"),
            v.literal("publishing"),
            v.literal("published"),
            v.literal("failed")
        ),
        scheduledFor: v.optional(v.number()),
        publishedAt: v.optional(v.number()),
        platformPostId: v.optional(v.string()),
        errorMessage: v.optional(v.string()),
    })
        .index("by_userId", ["userId"])
        .index("by_status", ["status"])
        .index("by_scheduled", ["scheduledFor"]),
});
