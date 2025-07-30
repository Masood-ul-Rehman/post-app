import { v } from "convex/values";
import { query } from "../_generated/server";

export const getByUserId = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("linkedinAccounts")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .collect();
    },
});

export const getByUserAccountId = query({
    args: { 
        userId: v.string(),
        userAccountId: v.string() 
    },
    handler: async (ctx, args) => {
        const accounts = await ctx.db
            .query("linkedinAccounts")
            .filter((q) => 
                q.and(
                    q.eq(q.field("userId"), args.userId),
                    q.eq(q.field("userAccountId"), args.userAccountId)
                )
            )
            .collect();
        return accounts[0];
    },
});

export const validateToken = query({
    args: { accountId: v.id("linkedinAccounts") },
    handler: async (ctx, args) => {
        const account = await ctx.db.get(args.accountId);
        if (!account) return { valid: false, error: "Account not found" };
        
        try {
            const response = await fetch("https://api.linkedin.com/v2/userinfo", {
                headers: {
                    Authorization: `Bearer ${account.accessToken}`,
                },
            });
            
            if (!response.ok) {
                return { valid: false, error: "Invalid or expired token" };
            }
            
            return { valid: true };
        } catch (error) {
            return { 
                valid: false, 
                error: error instanceof Error ? error.message : "Token validation failed" 
            };
        }
    },
});
