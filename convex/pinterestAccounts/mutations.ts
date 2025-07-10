import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const addAccount = mutation({
    args: {
        userId: v.string(),
        userAccountId: v.string(),
        accountName: v.string(),
        accountType: v.string(),
        accessToken: v.string(),
        username: v.optional(v.string()),
        refreshToken: v.optional(v.string()),
        expiresIn: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("pinterestAccounts", {
            userId: args.userId,
            userAccountId: args.userAccountId,
            accountName: args.accountName,
            accountType: args.accountType,
            accessToken: args.accessToken,
            username: args.username,
            refreshToken: args.refreshToken,
            expiresIn: args.expiresIn,
            createdAt: Date.now(),
        });
    },
}); 