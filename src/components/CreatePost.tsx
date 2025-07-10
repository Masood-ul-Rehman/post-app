import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { SocialAccount } from "../types/accounts";
import { useAuth } from "@clerk/clerk-react";

interface CreatePostProps {
    accounts: SocialAccount[];
}

export function CreatePost({ accounts }: CreatePostProps) {
    const { userId } = useAuth();
    const [content, setContent] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [isScheduled, setIsScheduled] = useState(false);
    const [isPosting, setIsPosting] = useState(false);

    const createPost = useMutation(api.posts.mutations.createPost);

    const handleAccountToggle = (accountId: string) => {
        setSelectedAccounts((prev) =>
            prev.includes(accountId)
                ? prev.filter((id) => id !== accountId)
                : [...prev, accountId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim()) {
            toast.error("Please enter post content");
            return;
        }

        if (selectedAccounts.length === 0) {
            toast.error("Please select at least one account");
            return;
        }

        if (!userId) {
            toast.error("User not authenticated");
            setIsPosting(false);
            return;
        }

        // Check if Instagram posts have images
        const instagramAccounts = accounts.filter(
            (acc) =>
                selectedAccounts.includes(acc.accountId) &&
                acc.platform === "instagram"
        );

        if (instagramAccounts.length > 0 && !imageUrl.trim()) {
            toast.error("Instagram posts require an image URL");
            return;
        }

        setIsPosting(true);

        try {
            let scheduledFor: number | undefined;

            if (isScheduled && scheduleDate && scheduleTime) {
                const scheduledDateTime = new Date(
                    `${scheduleDate}T${scheduleTime}`
                );
                if (scheduledDateTime <= new Date()) {
                    toast.error("Scheduled time must be in the future");
                    setIsPosting(false);
                    return;
                }
                scheduledFor = scheduledDateTime.getTime();
            }

            // Create posts for each selected account
            const promises = selectedAccounts.map((accountId) => {
                const account = accounts.find(
                    (acc) => acc.accountId === accountId
                );
                if (!account) return Promise.resolve();

                return createPost({
                    platform: account.platform,
                    accountId: account.accountId,
                    content,
                    imageUrl: imageUrl.trim() || undefined,
                    scheduledFor,
                    userId: userId!,
                });
            });

            await Promise.all(promises);

            toast.success(
                isScheduled
                    ? `Post scheduled for ${selectedAccounts.length} account(s)`
                    : `Post published to ${selectedAccounts.length} account(s)`
            );

            // Reset form
            setContent("");
            setImageUrl("");
            setSelectedAccounts([]);
            setScheduleDate("");
            setScheduleTime("");
            setIsScheduled(false);
        } catch (error) {
            toast.error("Failed to create post");
            console.error(error);
        } finally {
            setIsPosting(false);
        }
    };

    // Filter accounts to only supported platforms for posting
    const SUPPORTED_PLATFORMS = [
        "facebook",
        "instagram",
        "threads",
        "pinterest",
        "linkedin",
        "tiktok",
    ];
    const postableAccounts = accounts.filter((acc) =>
        SUPPORTED_PLATFORMS.includes(acc.platform)
    );

    return (
        <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-6">
                Create New Post
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Post Content */}
                <div>
                    <label
                        htmlFor="content"
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        Post Content
                    </label>
                    <textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="What's on your mind?"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                        {content.length}/2200 characters
                    </p>
                </div>

                {/* Image URL */}
                <div>
                    <label
                        htmlFor="imageUrl"
                        className="block text-sm font-medium text-gray-700 mb-2"
                    >
                        Image URL (Required for Instagram)
                    </label>
                    <input
                        type="url"
                        id="imageUrl"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://example.com/image.jpg"
                    />
                    {imageUrl && (
                        <div className="mt-2">
                            <img
                                src={imageUrl}
                                alt="Preview"
                                className="max-w-xs max-h-48 object-cover rounded-md"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Account Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Accounts
                    </label>
                    <div className="space-y-2">
                        {postableAccounts.length === 0 && (
                            <div className="text-sm text-red-500">
                                No supported accounts connected. Supported platforms: Facebook, Instagram, Threads, Pinterest, LinkedIn, TikTok.
                            </div>
                        )}
                        {postableAccounts.map((account) => (
                            <label
                                key={account._id}
                                className="flex items-center"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedAccounts.includes(
                                        account.accountId
                                    )}
                                    onChange={() =>
                                        handleAccountToggle(account.accountId)
                                    }
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="ml-3 flex items-center">
                                    <div
                                        className={`p-1 rounded ${account.platform === "facebook"
                                            ? "bg-blue-100"
                                            : "bg-pink-100"
                                            }`}
                                    >
                                        {account.platform === "facebook" ? (
                                            <svg
                                                className="w-4 h-4 text-blue-600"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                            </svg>
                                        ) : (
                                            <svg
                                                className="w-4 h-4 text-pink-600"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                            </svg>
                                        )}
                                    </div>
                                    <span className="ml-2 text-sm text-gray-900">
                                        {account.accountName} (
                                        {account.platform})
                                    </span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Scheduling */}
                <div>
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            checked={isScheduled}
                            onChange={(e) => setIsScheduled(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">
                            Schedule for later
                        </span>
                    </label>

                    {isScheduled && (
                        <div className="mt-3 grid grid-cols-2 gap-4">
                            <div>
                                <label
                                    htmlFor="scheduleDate"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Date
                                </label>
                                <input
                                    type="date"
                                    id="scheduleDate"
                                    value={scheduleDate}
                                    onChange={(e) =>
                                        setScheduleDate(e.target.value)
                                    }
                                    min={new Date().toISOString().split("T")[0]}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="scheduleTime"
                                    className="block text-sm font-medium text-gray-700 mb-1"
                                >
                                    Time
                                </label>
                                <input
                                    type="time"
                                    id="scheduleTime"
                                    value={scheduleTime}
                                    onChange={(e) =>
                                        setScheduleTime(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isPosting}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPosting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {isScheduled
                                    ? "Scheduling..."
                                    : "Publishing..."}
                            </>
                        ) : isScheduled ? (
                            "Schedule Post"
                        ) : (
                            "Publish Now"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
