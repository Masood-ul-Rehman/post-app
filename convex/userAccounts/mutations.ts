import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const create = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("userAccounts", {
      userId: args.userId,
    });
  },
});

export const addTikTokAccount = mutation({
  args: {
    userId: v.string(),
    openId: v.string(),
    linkedAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Get existing user account or create one
    let userAccount = await ctx.db
      .query("userAccounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!userAccount) {
      // Create new user account if it doesn't exist
      const userAccountId = await ctx.db.insert("userAccounts", {
        userId: args.userId,
        tiktokAccounts: [{ openId: args.openId, linkedAt: args.linkedAt }],
      });
      return userAccountId;
    }

    // Add TikTok account to existing user account
    const existingTikTokAccounts = userAccount.tiktokAccounts || [];
    const updatedTikTokAccounts = [
      ...existingTikTokAccounts,
      { openId: args.openId, linkedAt: args.linkedAt },
    ];

    return await ctx.db.patch(userAccount._id, {
      tiktokAccounts: updatedTikTokAccounts,
    });
  },
});
