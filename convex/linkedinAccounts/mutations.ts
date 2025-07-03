import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const addAccount = mutation({
  args: {
    userId: v.string(),
    userAccountId: v.string(),
    accountName: v.string(),
    accountType: v.string(),
    accessToken: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("linkedinAccounts", {
      userId: args.userId,
      userAccountId: args.userAccountId,
      accountName: args.accountName,
      accountType: args.accountType,
      accessToken: args.accessToken,
      createdAt: Date.now(),
    });
  },
});
