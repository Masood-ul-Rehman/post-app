import { Id } from "../../convex/_generated/dataModel";
import { SocialAccount } from "../types/accounts";

interface Post {
  _id: Id<"posts">;
  platform: "facebook" | "instagram" | "linkedin";
  accountId: string;
  content: string;
  imageUrl?: string;
  status: "draft" | "scheduled" | "published" | "failed";
  scheduledFor?: number;
  publishedAt?: number;
  _creationTime: number;
  errorMessage?: string;
}

interface PostsListProps {
  posts: Post[];
  accounts: SocialAccount[];
}

export function PostsList({ posts, accounts }: PostsListProps) {
  const getAccountName = (accountId: string) => {
    const account = accounts.find((acc) => acc.accountId === accountId);
    return account?.accountName || "Unknown Account";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "scheduled":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No posts yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Start by creating your first post.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Your Posts</h3>

      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post._id}
            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <div
                    className={`p-1 rounded ${
                      post.platform === "facebook"
                        ? "bg-blue-100"
                        : post.platform === "instagram"
                          ? "bg-pink-100"
                          : "bg-gray-100"
                    }`}
                  >
                    {post.platform === "facebook" ? (
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    ) : post.platform === "instagram" ? (
                      <svg
                        className="w-4 h-4 text-pink-600"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                      </svg>
                    ) : null}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {getAccountName(post.accountId)}
                  </span>
                  <span className="text-sm text-gray-500 capitalize">
                    • {post.platform}
                  </span>
                </div>

                <p className="text-gray-900 mb-3">{post.content}</p>

                {post.imageUrl && (
                  <div className="mb-3">
                    <img
                      src={post.imageUrl}
                      alt="Post image"
                      className="max-w-xs max-h-48 object-cover rounded-md"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Created: {formatDate(post._creationTime)}</span>
                  {post.scheduledFor && (
                    <span>Scheduled: {formatDate(post.scheduledFor)}</span>
                  )}
                  {post.publishedAt && (
                    <span>Published: {formatDate(post.publishedAt)}</span>
                  )}
                </div>

                {post.errorMessage && (
                  <div className="mt-2 text-sm text-red-600">
                    Error: {post.errorMessage}
                  </div>
                )}
              </div>

              <div className="ml-4">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}
                >
                  {post.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
