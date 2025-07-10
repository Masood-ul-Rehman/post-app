import { v } from "convex/values";
import { query } from "../_generated/server";

export const getAccountsByUserId = query({
    args: { userId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("pinterestAccounts")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();
    },
}); 