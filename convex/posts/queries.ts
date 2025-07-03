import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "../_generated/server";
import { v } from "convex/values";

export const getUserPosts = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("posts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
