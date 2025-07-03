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

export const updateUser = mutation({
  args: { userId: v.string(), name: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.patch(user._id, {
      name: args.name,
      email: args.email,
    });
    return user._id;
  },
});

export const deleteUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!user) throw new Error("User not found");
    await ctx.db.delete(user._id);
    return user._id;
  },
});
