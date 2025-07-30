import {
    S3Client,
    ListBucketsCommand,
    ListObjectsV2Command,
    GetObjectCommand,
    PutObjectCommand,
} from "@aws-sdk/client-s3";

export const S3 = new S3Client({
    region: "auto",
    endpoint:
        "https://f024512997e743da1802c6f10b901964.r2.cloudflarestorage.com",
    credentials: {
        accessKeyId: "b89f3b836e3ab215ec840bed87f3b5c1",
        secretAccessKey:
            "26d23f72ff52970451009eda9e45124a9623b95a6916c9a2eb0bce0f74d64268",
    },
});

console.log(await S3.send(new ListBucketsCommand({})));

// {
//   '$metadata': {
//     httpStatusCode: 200,
//     requestId: undefined,
//     extendedRequestId: undefined,
//     cfId: undefined,
//     attempts: 1,
//     totalRetryDelay: 0
//   },
//   Buckets: [ { Name: 'post-it', CreationDate: 2025-07-09T13:08:12.777Z } ],
//   Owner: {
//     DisplayName: '771b5a70664a7c931bfecf85708d6b32',
//     ID: '771b5a70664a7c931bfecf85708d6b32'
//   }
// }

console.log(await S3.send(new ListObjectsV2Command({ Bucket: "post-it" })));

// {
//   '$metadata': {
//     httpStatusCode: 200,
//     requestId: undefined,
//     extendedRequestId: undefined,
//     cfId: undefined,
//     attempts: 1,
//     totalRetryDelay: 0
//   },
//   IsTruncated: false,
//   KeyCount: 0,
//   MaxKeys: 1000,
//   Name: 'post-it'
// }
