import { v } from "convex/values";
import { query } from "../_generated/server";

export const getfileUrl = query({
    args: { fileIds: v.array(v.id("files")) },
    handler: async (ctx, args) => {
        const files = await Promise.all(
            args.fileIds.map((id) => ctx.db.get(id))
        );
        return files
            .filter((file): file is NonNullable<typeof file> => file !== null)
            .map((file) => process.env.VITE_R2_ENDPOINT + "/" + file.key);
    },
});
