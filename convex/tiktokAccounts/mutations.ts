import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const create = mutation({
  args: {
    userId: v.string(),
    openId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tiktokAccounts", {
      userId: args.userId,
      openId: args.openId,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresIn: args.expiresIn,
      createdAt: Date.now(),
    });
  },
});

export const updateTokens = mutation({
  args: {
    openId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number(),
  },
  handler: async (ctx, args) => {
    const existingAccount = await ctx.db
      .query("tiktokAccounts")
      .withIndex("by_openId", (q) => q.eq("openId", args.openId))
      .first();

    if (!existingAccount) {
      throw new Error("TikTok account not found");
    }

    return await ctx.db.patch(existingAccount._id, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      expiresIn: args.expiresIn,
    });
  },
});

export const startTikTokOAuth = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate a random state value for security
    const state = Math.random().toString(36).substring(7);

    // Construct the TikTok OAuth URL
    const params = new URLSearchParams({
      client_key: "aw54n4kji9zjif7s", // Replace with actual client key
      response_type: "code",
      scope: "user.info.basic,video.list,video.upload", // TikTok API scopes
      redirect_uri:
        "https://patient-woodpecker-658.convex.site/auth/tiktok/callback",
      state: state,
    });

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

    return {
      authUrl,
      state,
    };
  },
});
