import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createUser = mutation({
  args: { email: v.string(), name: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      userId: args.userId,
      createdAt: Date.now(),
    });
    return user;
  },
});
