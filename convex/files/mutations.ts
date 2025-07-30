import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const recordUpload = mutation({
    args: {
        key: v.string(),
        caption: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }
        return await ctx.db.insert("files", {
            userId: identity.subject,
            key: args.key,
            url: `https://f024512997e743da1802c6f10b901964.r2.cloudflarestorage.com/post-it/${args.key}`,
        });
    },
});