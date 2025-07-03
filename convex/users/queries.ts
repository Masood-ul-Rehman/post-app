import { v } from "convex/values";
import { query } from "../_generated/server";

export const getUserbyUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();
  },
});
