import { v } from "convex/values";
import { query } from "../_generated/server";

export const getUserAccounts = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.userId) {
      return await ctx.db
        .query("userAccounts")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect();
    }
    return await ctx.db.query("userAccounts").collect();
  },
});
