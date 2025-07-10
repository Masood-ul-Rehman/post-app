import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ConnectAccounts } from "./ConnectAccounts";
import { CreatePost } from "./CreatePost";
import { PostsList } from "./PostsList";
import { useUserAccounts } from "@/hooks/useUserAccounts";
import { useAuth } from "@clerk/clerk-react";

export function SocialMediaDashboard() {
  const [activeTab, setActiveTab] = useState<"posts" | "create" | "accounts">(
    "posts"
  );

  const { userId, isLoaded } = useAuth();
  if (!userId || !isLoaded) {
    return null;
  }

  const { accounts, isLoading } = useUserAccounts(userId);

  const posts =
    useQuery(api.posts.queries.getUserPosts, {
      userId,
    }) || [];

  const hasConnectedAccounts = accounts.length > 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Connected Accounts
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {accounts.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Published Posts
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {posts.filter((p) => p.status === "published").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Scheduled Posts
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {posts.filter((p) => p.status === "scheduled").length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab("posts")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "posts"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "create"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Create Post
            </button>
            <button
              onClick={() => setActiveTab("accounts")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === "accounts"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
            >
              Accounts
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "posts" && (
            <div>
              {hasConnectedAccounts ? (
                <PostsList posts={posts} accounts={accounts} />
              ) : (
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
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No posts yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Connect your social media accounts to start posting.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setActiveTab("accounts")}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Connect Accounts
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "create" && (
            <div>
              {hasConnectedAccounts ? (
                <CreatePost accounts={accounts} />
              ) : (
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
                      d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    Connect accounts first
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You need to connect your social media accounts before
                    creating posts.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setActiveTab("accounts")}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Connect Accounts
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "accounts" && (
            <ConnectAccounts accounts={accounts} userId={userId} />
          )}
        </div>
      </div>
    </div>
  );
}
