// import { query, mutation, action } from "./_generated/server";
// import { v } from "convex/values";
// import { getAuthUserId } from "@convex-dev/auth/server";
// import { api } from "./_generated/api";

// // Get user's connected social accounts
// export const getUserAccounts = query({
//   args: {},
//   handler: async (ctx) => {
//     const userId = await getAuthUserId(ctx);
//     if (!userId) {
//       throw new Error("Not authenticated");
//     }

//     return await ctx.db
//       .query("socialAccounts")
//       .withIndex("by_user", (q) => q.eq("userId", userId))
//       .filter((q) => q.eq(q.field("isActive"), true))
//       .collect();
//   },
// });

// // Get user's posts
// export const getUserPosts = query({
//   args: {},
//   handler: async (ctx) => {
//     const userId = await getAuthUserId(ctx);
//     if (!userId) {
//       throw new Error("Not authenticated");
//     }

//     return await ctx.db
//       .query("posts")
//       .withIndex("by_user", (q) => q.eq("userId", userId))
//       .order("desc")
//       .take(50);
//   },
// });

// // Save social account connection
// export const saveSocialAccount = mutation({
//   args: {
//     platform: v.union(v.literal("facebook"), v.literal("instagram")),
//     accountId: v.string(),
//     accountName: v.string(),
//     accessToken: v.string(),
//   },
//   handler: async (ctx, args) => {
//     const userId = await getAuthUserId(ctx);
//     if (!userId) {
//       throw new Error("Not authenticated");
//     }

//     // Check if account already exists
//     const existing = await ctx.db
//       .query("socialAccounts")
//       .withIndex("by_user", (q) => q.eq("userId", userId))
//       .filter((q) =>
//         q.and(
//           q.eq(q.field("platform"), args.platform),
//           q.eq(q.field("accountId"), args.accountId)
//         )
//       )
//       .first();

//     if (existing) {
//       // Update existing account
//       await ctx.db.patch(existing._id, {
//         accountName: args.accountName,
//         accessToken: args.accessToken,
//         isActive: true,
//       });
//       return existing._id;
//     } else {
//       // Create new account
//       return await ctx.db.insert("socialAccounts", {
//         userId,
//         platform: args.platform,
//         accountId: args.accountId,
//         accountName: args.accountName,
//         accessToken: args.accessToken,
//         isActive: true,
//       });
//     }
//   },
// });

// // Create a new post
// export const createPost = mutation({
//   args: {
//     platform: v.union(v.literal("facebook"), v.literal("instagram")),
//     accountId: v.string(),
//     content: v.string(),
//     imageUrl: v.optional(v.string()),
//     scheduledFor: v.optional(v.number()),
//   },
//   handler: async (ctx, args) => {
//     const userId = await getAuthUserId(ctx);
//     if (!userId) {
//       throw new Error("Not authenticated");
//     }

//     const postId = await ctx.db.insert("posts", {
//       userId,
//       platform: args.platform,
//       accountId: args.accountId,
//       content: args.content,
//       imageUrl: args.imageUrl,
//       status: args.scheduledFor ? "scheduled" : "draft",
//       scheduledFor: args.scheduledFor,
//     });

//     // If not scheduled, publish immediately
//     if (!args.scheduledFor) {
//       await ctx.scheduler.runAfter(0, api.socialMedia.publishPost, { postId });
//     }

//     return postId;
//   },
// });

// // Publish a post to social media
// export const publishPost = action({
//   args: { postId: v.id("posts") },
//   handler: async (ctx, args) => {
//     const post = await ctx.runQuery(api.socialMedia.getPost, { postId: args.postId });
//     if (!post) {
//       throw new Error("Post not found");
//     }

//     const account = await ctx.runQuery(api.socialMedia.getAccount, {
//       userId: post.userId,
//       platform: post.platform,
//       accountId: post.accountId
//     });

//     if (!account) {
//       await ctx.runMutation(api.socialMedia.updatePostStatus, {
//         postId: args.postId,
//         status: "failed",
//         errorMessage: "Social account not found",
//       });
//       return;
//     }

//     try {
//       let platformPostId: string;

//       if (post.platform === "facebook") {
//         platformPostId = await publishToFacebook(post, account.accessToken);
//       } else {
//         platformPostId = await publishToInstagram(post, account.accessToken);
//       }

//       await ctx.runMutation(api.socialMedia.updatePostStatus, {
//         postId: args.postId,
//         status: "published",
//         platformPostId,
//         publishedAt: Date.now(),
//       });
//     } catch (error) {
//       await ctx.runMutation(api.socialMedia.updatePostStatus, {
//         postId: args.postId,
//         status: "failed",
//         errorMessage: error instanceof Error ? error.message : "Unknown error",
//       });
//     }
//   },
// });

// // Helper queries for actions
// export const getPost = query({
//   args: { postId: v.id("posts") },
//   handler: async (ctx, args) => {
//     return await ctx.db.get(args.postId);
//   },
// });

// export const getAccount = query({
//   args: {
//     userId: v.id("users"),
//     platform: v.union(v.literal("facebook"), v.literal("instagram")),
//     accountId: v.string(),
//   },
//   handler: async (ctx, args) => {
//     return await ctx.db
//       .query("socialAccounts")
//       .withIndex("by_user", (q) => q.eq("userId", args.userId))
//       .filter((q) =>
//         q.and(
//           q.eq(q.field("platform"), args.platform),
//           q.eq(q.field("accountId"), args.accountId),
//           q.eq(q.field("isActive"), true)
//         )
//       )
//       .first();
//   },
// });

// export const updatePostStatus = mutation({
//   args: {
//     postId: v.id("posts"),
//     status: v.union(
//       v.literal("draft"),
//       v.literal("scheduled"),
//       v.literal("published"),
//       v.literal("failed")
//     ),
//     platformPostId: v.optional(v.string()),
//     publishedAt: v.optional(v.number()),
//     errorMessage: v.optional(v.string()),
//   },
//   handler: async (ctx, args) => {
//     await ctx.db.patch(args.postId, {
//       status: args.status,
//       platformPostId: args.platformPostId,
//       publishedAt: args.publishedAt,
//       errorMessage: args.errorMessage,
//     });
//   },
// });

// // Facebook API integration
// async function publishToFacebook(post: any, accessToken: string): Promise<string> {
//   const url = `https://graph.facebook.com/v18.0/${post.accountId}/feed`;

//   const body: any = {
//     message: post.content,
//     access_token: accessToken,
//   };

//   if (post.imageUrl) {
//     body.link = post.imageUrl;
//   }

//   const response = await fetch(url, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(body),
//   });

//   if (!response.ok) {
//     const error = await response.json();
//     throw new Error(`Facebook API error: ${error.error?.message || 'Unknown error'}`);
//   }

//   const result = await response.json();
//   return result.id;
// }

// // Instagram API integration
// async function publishToInstagram(post: any, accessToken: string): Promise<string> {
//   // Instagram requires a two-step process: create media, then publish

//   // Step 1: Create media container
//   const createUrl = `https://graph.facebook.com/v18.0/${post.accountId}/media`;

//   const createBody: any = {
//     caption: post.content,
//     access_token: accessToken,
//   };

//   if (post.imageUrl) {
//     createBody.image_url = post.imageUrl;
//   } else {
//     throw new Error("Instagram posts require an image");
//   }

//   const createResponse = await fetch(createUrl, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify(createBody),
//   });

//   if (!createResponse.ok) {
//     const error = await createResponse.json();
//     throw new Error(`Instagram API error: ${error.error?.message || 'Unknown error'}`);
//   }

//   const createResult = await createResponse.json();
//   const mediaId = createResult.id;

//   // Step 2: Publish the media
//   const publishUrl = `https://graph.facebook.com/v18.0/${post.accountId}/media_publish`;

//   const publishResponse = await fetch(publishUrl, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({
//       creation_id: mediaId,
//       access_token: accessToken,
//     }),
//   });

//   if (!publishResponse.ok) {
//     const error = await publishResponse.json();
//     throw new Error(`Instagram publish error: ${error.error?.message || 'Unknown error'}`);
//   }

//   const publishResult = await publishResponse.json();
//   return publishResult.id;
// }

// // Disconnect social account
// export const disconnectAccount = mutation({
//   args: {
//     accountId: v.id("socialAccounts"),
//   },
//   handler: async (ctx, args) => {
//     const userId = await getAuthUserId(ctx);
//     if (!userId) {
//       throw new Error("Not authenticated");
//     }

//     const account = await ctx.db.get(args.accountId);
//     if (!account || account.userId !== userId) {
//       throw new Error("Account not found or unauthorized");
//     }

//     await ctx.db.patch(args.accountId, { isActive: false });
//   },
// });
