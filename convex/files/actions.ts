import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuid } from "uuid";
import { action } from "../_generated/server";
import { v } from "convex/values";

const r2 = new S3Client({
    endpoint: `https://f024512997e743da1802c6f10b901964.r2.cloudflarestorage.com`,
    region: "auto", // R2 ignores region but SDK requires it
    credentials: {
        accessKeyId: 'b89f3b836e3ab215ec840bed87f3b5c1',
        secretAccessKey: '26d23f72ff52970451009eda9e45124a9623b95a6916c9a2eb0bce0f74d64268',
    },
});

// Action to generate a presigned upload URL and object key
export const getUploadUrl = action({
    args: {
        filename: v.string(),
        contentType: v.string(),
    },
    handler: async (ctx, { filename, contentType }) => {
        // Check authentication
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }

        // Extract file extension
        const ext = filename.split('.').pop() || '';

        // Generate unique key: uploads/{userId}/{uuid}.{ext}
        const key = `uploads/${identity.subject}/${uuid()}.${ext}`;

        // Prepare S3 PutObject command
        const command = new PutObjectCommand({
            Bucket: 'post-it',
            Key: key,
            ContentType: contentType,
            // Note: R2 doesn't support ACL, remove this line if it causes issues
            // ACL: 'public-read',
        });

        try {
            // Generate a presigned URL valid for 5 minutes
            const url = await getSignedUrl(r2, command, { expiresIn: 300 });
            console.log('[getUploadUrl]' + url + '   key:' + key)
            return { url, key };
        } catch (error) {
            console.error("Error generating presigned URL:", error);
            throw new Error("Failed to generate upload URL");
        }
    },
});