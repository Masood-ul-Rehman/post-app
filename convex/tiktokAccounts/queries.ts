import { v } from "convex/values";
import { query } from "../_generated/server";

export const getByOpenId = query({
  args: {
    openId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tiktokAccounts")
      .withIndex("by_openId", (q) => q.eq("openId", args.openId))
      .first();
  },
});

export const getByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tiktokAccounts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
