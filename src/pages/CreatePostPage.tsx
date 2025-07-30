/**
 * CreatePostPage - Social Media Post Creation with File Upload
 *
 * This component integrates with the Zustand upload store to handle file uploads.
 *
 * Key Features:
 * - File upload with progress tracking
 * - Real-time status updates (pending, uploading, done, error)
 * - Automatic cleanup of completed uploads after 5 seconds
 * - Integration with Convex for file storage
 * - Prevents post publishing while uploads are in progress
 *
 * Upload Store Integration:
 * - Uses useUploadStore hook to manage upload state
 * - Files are automatically queued and uploaded in the background
 * - Progress is tracked and displayed in real-time
 * - Uploaded file URLs and keys are available via getUploadedFiles()
 */

import { useState, useRef, SetStateAction, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    Calendar,
    Clock,
    ImageIcon,
    Video,
    File,
    X,
    GripVertical,
    Smile,
    Upload,
    Facebook,
    Twitter,
    Instagram,
    Linkedin,
} from "lucide-react";
import { useUploadStore } from "../store/uploadStore";
import { useConvex, useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { useUserAccounts } from "@/hooks/useUserAccounts";
import { api } from "../../convex/_generated/api";

const emojis = [
    "😀",
    "😂",
    "❤️",
    "👍",
    "🎉",
    "🔥",
    "💯",
    "✨",
    "🚀",
    "💪",
    "🌟",
    "👏",
];

export default function CreatePostPage() {
    const [postContent, setPostContent] = useState("");
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDate, setScheduledDate] = useState("");
    const [scheduledTime, setScheduledTime] = useState("");
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { userId } = useAuth();
    const createPost = useMutation(api.posts.mutations.createPost);

    const { accounts, isLoading } = useUserAccounts(userId || "");
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

    // Use the Zustand upload store
    const { tasks, enqueue, removeTask, getUploadedFiles, setConvexClient } =
        useUploadStore();
    const convex = useConvex();

    // Set the Convex client in the store when component mounts
    useEffect(() => {
        setConvexClient(convex);
    }, [convex, setConvexClient]);

    const handleFileUpload = (files: FileList | null) => {
        if (!files) return;

        if (!userId) {
            console.error("User not authenticated");
            return;
        }

        Array.from(files).forEach((file) => {
            // Use the store's enqueue method to handle uploads
            enqueue(file);
        });
    };

    const removeFile = (taskId: string) => {
        removeTask(taskId);
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null) return;

        // Note: Since we're using the store now, we can't easily reorder files
        // This would require additional store methods for reordering
        setDraggedIndex(null);
    };

    const toggleAccount = (accountId: string) => {
        setSelectedAccounts((prev) =>
            prev.includes(accountId)
                ? prev.filter((id) => id !== accountId)
                : [...prev, accountId]
        );
    };

    const insertEmoji = (emoji: string) => {
        setPostContent((prev) => prev + emoji);
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />;
        if (type.startsWith("video/")) return <Video className="w-4 h-4" />;
        return <File className="w-4 h-4" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (
            Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
            " " +
            sizes[i]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "done":
                return "text-green-600";
            case "error":
                return "text-red-600";
            case "uploading":
                return "text-blue-600";
            default:
                return "text-gray-600";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "done":
                return "Uploaded";
            case "error":
                return "Failed";
            case "uploading":
                return "Uploading...";
            default:
                return "Pending";
        }
    };

    const handlePublish = () => {
        const uploadedFiles = getUploadedFiles();
        console.log("Publishing post with content:", postContent);
        console.log("Selected accounts:", selectedAccounts);
        console.log("Uploaded files:", uploadedFiles);

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

        if (instagramAccounts.length > 0 && fileUrls.length === 0) {
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
                    fileUrls: fileUrls,
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

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Create Post
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Compose and schedule your social media content
                    </p>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Post Composition */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Text Input */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Smile className="w-5 h-5" />
                                    Post Content
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    placeholder="What's on your mind?"
                                    value={postContent}
                                    onChange={(e: {
                                        target: {
                                            value: SetStateAction<string>;
                                        };
                                    }) => setPostContent(e.target.value)}
                                    className="min-h-[120px] resize-none"
                                />

                                {/* Emoji Picker */}
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-sm text-gray-600 mr-2">
                                        Quick emojis:
                                    </span>
                                    {emojis.map((emoji, index) => (
                                        <Button
                                            key={index}
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => insertEmoji(emoji)}
                                            className="h-8 w-8 p-0 hover:bg-gray-100"
                                        >
                                            {emoji}
                                        </Button>
                                    ))}
                                </div>

                                <div className="text-sm text-gray-500">
                                    {postContent.length}/280 characters
                                </div>
                            </CardContent>
                        </Card>

                        {/* File Upload */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="w-5 h-5" />
                                    Media Files
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Upload Area */}
                                <div
                                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                        userId
                                            ? "border-gray-300 hover:border-gray-400 cursor-pointer"
                                            : "border-gray-200 bg-gray-50 cursor-not-allowed"
                                    }`}
                                    onClick={() =>
                                        userId && fileInputRef.current?.click()
                                    }
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        handleFileUpload(e.dataTransfer.files);
                                    }}
                                    onDragOver={(e) => e.preventDefault()}
                                >
                                    <Upload
                                        className={`w-8 h-8 mx-auto mb-2 ${userId ? "text-gray-400" : "text-gray-300"}`}
                                    />
                                    <p
                                        className={
                                            userId
                                                ? "text-gray-600"
                                                : "text-gray-400"
                                        }
                                    >
                                        {userId
                                            ? "Click to upload or drag and drop"
                                            : "Please sign in to upload files"}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {userId
                                            ? "Images, videos, and documents"
                                            : "Authentication required"}
                                    </p>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,video/*,.pdf,.doc,.docx"
                                    onChange={(e) =>
                                        handleFileUpload(e.target.files)
                                    }
                                    className="hidden"
                                />

                                {/* Upload Summary */}
                                {tasks.length > 0 && (
                                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Upload className="w-4 h-4 text-blue-600" />
                                                <span className="text-sm font-medium text-blue-900">
                                                    Upload Progress
                                                </span>
                                            </div>
                                            <div className="text-xs text-blue-700">
                                                {
                                                    tasks.filter(
                                                        (t) =>
                                                            t.status === "done"
                                                    ).length
                                                }{" "}
                                                of {tasks.length} complete
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Uploaded Files */}
                                {tasks.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="font-medium text-gray-900">
                                            Uploaded Files
                                        </h4>
                                        {tasks
                                            .filter(
                                                (task) =>
                                                    task.file && task.file.name
                                            )
                                            .map((task, index) => (
                                                <div
                                                    key={task.id}
                                                    className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                                                >
                                                    <GripVertical className="w-4 h-4 text-gray-400" />

                                                    {task.file.type?.startsWith(
                                                        "image/"
                                                    ) ? (
                                                        <img
                                                            src={URL.createObjectURL(
                                                                task.file
                                                            )}
                                                            alt={task.file.name}
                                                            className="w-12 h-12 object-cover rounded"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                                            {getFileIcon(
                                                                task.file
                                                                    .type ||
                                                                    "application/octet-stream"
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                {task.file
                                                                    .name ||
                                                                    "Unknown file"}
                                                            </p>
                                                            <Badge
                                                                variant="secondary"
                                                                className={`text-xs ${getStatusColor(task.status)}`}
                                                            >
                                                                {getStatusText(
                                                                    task.status
                                                                )}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-gray-500">
                                                            {formatFileSize(
                                                                task.file
                                                                    .size || 0
                                                            )}
                                                        </p>
                                                        {task.status ===
                                                            "uploading" && (
                                                            <Progress
                                                                value={
                                                                    task.progress
                                                                }
                                                                className="mt-1 h-1"
                                                            />
                                                        )}
                                                        {task.status ===
                                                            "done" &&
                                                            task.url && (
                                                                <p className="text-xs text-green-600 mt-1">
                                                                    ✓ Upload
                                                                    complete
                                                                </p>
                                                            )}
                                                        {task.status ===
                                                            "error" && (
                                                            <p className="text-xs text-red-600 mt-1">
                                                                ✗ Upload failed
                                                            </p>
                                                        )}
                                                    </div>

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            removeFile(task.id)
                                                        }
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Settings */}
                    <div className="space-y-6">
                        {/* Account Selection */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Select Accounts</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {postableAccounts.map((account) => (
                                    <div
                                        key={account._id}
                                        className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors 
                                            `}
                                        // onClick={() =>
                                        //     account.connected &&
                                        //     toggleAccount(account._id)
                                        // }
                                    >
                                        <Checkbox
                                            checked={selectedAccounts.includes(
                                                account._id
                                            )}
                                            // disabled={!account.connected}
                                            onChange={() => {}}
                                        />
                                        <div className="flex items-center gap-2 flex-1">
                                            {/* {account.icon} */}
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {account.platform}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {account.accountName}
                                                </p>
                                            </div>
                                        </div>
                                        {/* {!account.connected && (
                                            <Badge
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                Not Connected
                                            </Badge>
                                        )} */}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Scheduling */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Schedule Post
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="schedule"
                                        checked={isScheduled}
                                        onCheckedChange={(checked: boolean) =>
                                            setIsScheduled(checked as boolean)
                                        }
                                    />
                                    <Label htmlFor="schedule">
                                        Schedule for later
                                    </Label>
                                </div>

                                {isScheduled && (
                                    <div className="space-y-4 pt-2">
                                        <div>
                                            <Label
                                                htmlFor="date"
                                                className="text-sm font-medium"
                                            >
                                                Date
                                            </Label>
                                            <Input
                                                id="date"
                                                type="date"
                                                value={scheduledDate}
                                                onChange={(e) =>
                                                    setScheduledDate(
                                                        e.target.value
                                                    )
                                                }
                                                min={
                                                    new Date()
                                                        .toISOString()
                                                        .split("T")[0]
                                                }
                                                className="mt-1"
                                            />
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="time"
                                                className="text-sm font-medium"
                                            >
                                                Time
                                            </Label>
                                            <Input
                                                id="time"
                                                type="time"
                                                value={scheduledTime}
                                                onChange={(e: {
                                                    target: {
                                                        value: SetStateAction<string>;
                                                    };
                                                }) =>
                                                    setScheduledTime(
                                                        e.target.value
                                                    )
                                                }
                                                className="mt-1"
                                            />
                                        </div>

                                        <p className="text-xs text-gray-500">
                                            Posts will be published in your
                                            local timezone
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handlePublish}
                                disabled={
                                    !postContent.trim() ||
                                    selectedAccounts.length === 0 ||
                                    tasks.some(
                                        (t) =>
                                            t.status === "uploading" ||
                                            t.status === "pending"
                                    )
                                }
                            >
                                {isScheduled ? (
                                    <>
                                        <Clock className="w-4 h-4 mr-2" />
                                        Schedule Post
                                    </>
                                ) : (
                                    "Publish Now"
                                )}
                            </Button>

                            {tasks.some(
                                (t) =>
                                    t.status === "uploading" ||
                                    t.status === "pending"
                            ) && (
                                <p className="text-xs text-amber-600 text-center">
                                    Please wait for all files to finish
                                    uploading
                                </p>
                            )}

                            <Button
                                variant="outline"
                                className="w-full bg-transparent"
                            >
                                Save as Draft
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
