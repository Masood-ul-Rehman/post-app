/**
 * Upload Store - Zustand-based file upload management
 * 
 * This store manages file uploads with progress tracking and status management.
 * It integrates with Convex for file storage and provides a clean API for
 * handling multiple concurrent uploads.
 * 
 * Features:
 * - Queue-based upload management
 * - Real-time progress tracking
 * - Status management (pending, uploading, done, error)
 * - Automatic cleanup of completed uploads
 * - Persistence across page reloads
 * - Integration with Convex file storage
 * 
 * Usage:
 * const { tasks, enqueue, removeTask, getUploadedFiles } = useUploadStore();
 * 
 * // Start an upload
 * enqueue(file);
 * 
 * // Get uploaded files for post creation
 * const uploadedFiles = getUploadedFiles();
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../../convex/_generated/api';
import { ConvexReactClient } from 'convex/react';

// --- Types ---
interface Task {
    id: string
    file: File
    key?: string
    url?: string
    progress: number
    status: "pending" | "uploading" | "done" | "error"
}

// For persistence, we only store metadata
interface TaskMetadata {
    id: string
    fileName: string
    fileType: string
    fileSize: number
    key?: string
    url?: string
    progress: number
    status: "pending" | "uploading" | "done" | "error"
}

interface UploadState {
    tasks: Task[]
    convexClient: ConvexReactClient | null
    setConvexClient: (client: ConvexReactClient) => void
    enqueue: (file: File) => void
    updateProgress: (id: string, progress: number) => void
    updateStatus: (id: string, status: Task["status"], key?: string, url?: string) => void
    removeTask: (id: string) => void
    getUploadedFiles: () => Array<{ key: string; url: string; name: string; type: string }>
}

// --- Store ---
export const useUploadStore = create<UploadState>()(
    persist(
        (set, get) => ({
            tasks: [],
            convexClient: null,
            setConvexClient: (client) => set({ convexClient: client }),
            enqueue: (file) => {
                const id = crypto.randomUUID();
                set((state) => ({
                    tasks: [
                        ...state.tasks,
                        { id, file, progress: 0, status: "pending" },
                    ],
                }));

                // kick off upload in background
                (async () => {
                    const { convexClient } = get();
                    if (!convexClient) {
                        console.error('Convex client not set');
                        get().updateStatus(id, "error");
                        return;
                    }

                    try {
                        set((state) => ({
                            tasks: state.tasks.map(t =>
                                t.id === id ? { ...t, status: "uploading" } : t
                            ),
                        }));

                        // Get upload URL from Convex using the authenticated client
                        const { url, key } = await convexClient.action(api.files.actions.getUploadUrl, {
                            filename: file.name,
                            contentType: file.type
                        });

                        // Upload the file with progress tracking
                        await uploadWithProgress(file, url, (pct) => {
                            get().updateProgress(id, pct);
                        });

                        // Update status to done with the key and URL
                        get().updateStatus(id, "done", key, url);

                        // Remove task after 5 seconds
                        setTimeout(() => get().removeTask(id), 5000);
                    } catch (error) {
                        console.error('Upload error:', error);
                        get().updateStatus(id, "error");
                    }
                })();
            },
            updateProgress: (id, progress) =>
                set((state) => ({
                    tasks: state.tasks.map(t =>
                        t.id === id ? { ...t, progress } : t
                    ),
                })),
            updateStatus: (id, status, key, url) =>
                set((state) => ({
                    tasks: state.tasks.map(t =>
                        t.id === id
                            ? { ...t, status, key: key ?? t.key, url: url ?? t.url }
                            : t
                    ),
                })),
            removeTask: (id) =>
                set((state) => ({ tasks: state.tasks.filter(t => t.id !== id) })),
            getUploadedFiles: () => {
                const state = get();
                return state.tasks
                    .filter(task => task.status === "done" && task.key && task.url && task.file && task.file.name)
                    .map(task => ({
                        key: task.key!,
                        url: task.url!,
                        name: task.file.name,
                        type: task.file.type || "application/octet-stream"
                    }));
            },
        }),
        {
            name: "upload-storage",
            storage: {
                getItem: (name: string) => {
                    const str = localStorage.getItem(name);
                    if (!str) return null;
                    try {
                        const parsed = JSON.parse(str);
                        // Convert metadata back to tasks with placeholder files
                        if (parsed.state && parsed.state.tasks) {
                            parsed.state.tasks = parsed.state.tasks
                                .filter((task: any) => task.status === "done" || task.status === "error")
                                .map((task: any) => ({
                                    ...task,
                                    file: new File([], task.fileName || "unknown", {
                                        type: task.fileType || "application/octet-stream"
                                    })
                                }));
                        }
                        return parsed;
                    } catch {
                        return null;
                    }
                },
                setItem: (name: string, value: any) => {
                    // Convert tasks to metadata for storage
                    const metadataValue = {
                        ...value,
                        state: {
                            ...value.state,
                            tasks: value.state.tasks.map((task: Task) => ({
                                id: task.id,
                                fileName: task.file.name,
                                fileType: task.file.type,
                                fileSize: task.file.size,
                                key: task.key,
                                url: task.url,
                                progress: task.progress,
                                status: task.status
                            }))
                        }
                    };
                    localStorage.setItem(name, JSON.stringify(metadataValue));
                },
                removeItem: (name: string) => localStorage.removeItem(name),
            },
        }
    )
)

// --- Upload util ---
async function uploadWithProgress(
    file: File,
    presignedUrl: string,
    onProgress: (pct: number) => void
) {
    return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open("PUT", presignedUrl, true)
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const pct = Math.round((event.loaded / event.total) * 100)
                onProgress(pct)
            }
        }
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error(`Status ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error("Network error"))
        xhr.setRequestHeader("Content-Type", file.type)
        xhr.send(file)
    })
}
