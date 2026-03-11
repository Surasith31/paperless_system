// ================================================================
// 📤 useFileUpload Hook - Support Multiple Files
// ================================================================
"use client";

import { useState } from "react";

interface UploadedFile {
  fileId: number;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl: string;
}

interface UploadProgress {
  isUploading: boolean;
  progress: number;
  error: string | null;
}

export function useFileUpload() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  const uploadFiles = async (files: File[]): Promise<UploadedFile[] | null> => {
    try {
      setUploadProgress({
        isUploading: true,
        progress: 0,
        error: null,
      });

      // Create form data
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file); // ใช้ชื่อ "files" สำหรับหลายไฟล์
      });

      // Upload files
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "การอัพโหลดล้มเหลว");
      }

      const data = await response.json();

      setUploadProgress({
        isUploading: false,
        progress: 100,
        error: null,
      });

      return data.files; // Return array of files
    } catch {
      setUploadProgress({
        isUploading: false,
        progress: 0,
        error: "อัปโหลดล้มเหลว",
      });
      return null;
    }
  };

  const resetUpload = () => {
    setUploadProgress({
      isUploading: false,
      progress: 0,
      error: null,
    });
  };

  return {
    uploadFiles,
    ...uploadProgress,
    resetUpload,
  };
}
