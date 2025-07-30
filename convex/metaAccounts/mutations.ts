import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const addAccount = mutation({
  args: {
    userId: v.string(),
    pageId: v.string(),
    userAccountId: v.string(),
    accountName: v.string(),
    accountType: v.string(),
    accessToken: v.string(),
    pagePermissions: v.optional(v.array(v.string())),
    username: v.optional(v.string()),
    instagramAccount: v.optional(
      v.object({
        id: v.string(),
        username: v.string(),
        name: v.string(),
        profile_picture_url: v.optional(v.string()),
        igBusinessId: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const accountId = await ctx.db.insert("metaAccounts", {
      userId: args.userId,
      pageId: args.pageId,
      userAccountId: args.userAccountId,
      accountName: args.accountName,
      accountType: args.accountType,
      accessToken: args.accessToken,
      pagePermissions: args.pagePermissions,
      username: args.username,
      instagramAccount: args.instagramAccount,
      createdAt: Date.now(),
    });

    // Update userAccounts to include the new meta account ID
    const userAccount = await ctx.db
      .query("userAccounts")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (userAccount) {
      // Add the new account ID to the metaAccounts array
      const updatedMetaAccounts = [
        ...(userAccount.metaAccounts || []),
        accountId,
      ];
      await ctx.db.patch(userAccount._id, {
        metaAccounts: updatedMetaAccounts,
      });
    } else {
      // Create new userAccount if it doesn't exist
      await ctx.db.insert("userAccounts", {
        userId: args.userId,
        metaAccounts: [accountId],
      });
    }

    return accountId;
  },
});

export const updateAccessToken = mutation({
  args: {
    accountId: v.id("metaAccounts"),
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, { accessToken: args.accessToken });
    return null;
  },
});
