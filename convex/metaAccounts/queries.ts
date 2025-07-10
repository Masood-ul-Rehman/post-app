import { v } from "convex/values";
import { query } from "../_generated/server";

export const getByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("metaAccounts")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
  },
});

export const getByUserAccountType = query({
  args: {
    userId: v.string(),
    accountId: v.string(),
    accountType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("metaAccounts")
      .filter((q) =>
        q.eq(q.field("userId"), args.userId) &&
        q.eq(q.field("pageId"), args.accountId) &&
        q.eq(q.field("accountType"), args.accountType)
      )
      .unique();
  },
});
