import React from "react"
import { Progress } from "@/components/ui/progress"
import { X } from "lucide-react"
import { useUploadStore } from "@/store/uploadStore"

export function UploadToast() {
    const { tasks, removeTask } = useUploadStore()
    if (tasks.length === 0) return null

    return (
        <div className="fixed bottom-4 right-4 w-80 space-y-2 z-50">
            {tasks.map((t) => (
                <div
                    key={t.id}
                    className="bg-white p-3 rounded-lg shadow-md flex items-center space-x-3"
                >
                    <div className="flex-1">
                        <p className="text-sm truncate">{t.file.name}</p>
                        <Progress value={t.progress} className="h-2 mt-1" />
                        {t.status === "error" && (
                            <p className="text-xs text-red-500">Upload failed</p>
                        )}
                    </div>
                    <button
                        onClick={() => removeTask(t.id)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
        </div>
    )
}