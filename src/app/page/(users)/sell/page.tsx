"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useFileUpload } from "@/hooks/useFileUpload";

import {
  Upload,
  FileText,
  X,
  Loader2,
  ArrowLeft,
  Image as ImageIcon,
  FileSpreadsheet,
} from "lucide-react";
import { Manager, userGetResponse } from "@/models/user";
import Alert from "@/components/Alert";
import Loading from "@/components/Loading";

interface UploadedFileInfo {
  fileId: number;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export default function SellSubmitDocument() {
  const router = useRouter();
  const { uploadFiles, isUploading, error: uploadError } = useFileUpload();

  const [user, setUser] = useState<userGetResponse | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    manager_id: "",
    message: "",
  });

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const response = await fetch("/api/auth/profile", {
          credentials: "include",
        });

        if (!response.ok) {
          router.push("/page/login");
          return;
        }

        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);

          // Check if user is Sell
          if (data.user.role !== 1) {
            router.push("/page/dashboard");
          }
        }
      } catch (err) {
        console.error("Error:", err);
        router.push("/page/login");
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchManagers() {
      try {
        const response = await fetch("/api/users/managers", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setManagers(data.managers || []);
        }
      } catch (err) {
        console.error("Error fetching managers:", err);
      }
    }

    fetchUserProfile();
    fetchManagers();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    addFiles(files);
  };

  const addFiles = (files: File[]) => {
    // ตรวจสอบจำนวนไฟล์ (สูงสุด 10 ไฟล์)
    const totalFiles = selectedFiles.length + files.length;
    if (totalFiles > 10) {
      setError("สามารถอัพโหลดได้สูงสุด 10 ไฟล์");
      return;
    }

    // ไม่จำกัดขนาดไฟล์แล้ว - เอาออกทั้งหมด
    setSelectedFiles([...selectedFiles, ...files]);
    setError("");
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (!formData.title || !formData.manager_id || selectedFiles.length === 0) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วนและเลือกไฟล์อย่างน้อย 1 ไฟล์");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload files first
      const uploadedFiles = await uploadFiles(selectedFiles);

      if (!uploadedFiles) {
        setError(uploadError || "ไม่สามารถอัพโหลดไฟล์ได้");
        setIsSubmitting(false);
        return;
      }

      // 2. Submit document with file paths
      const file_paths = uploadedFiles
        .map((f: UploadedFileInfo) => f.filePath)
        .join(",");

      const response = await fetch("/api/documents/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          file_path: file_paths, // ส่ง comma-separated paths
          file_name: uploadedFiles
            .map((f: UploadedFileInfo) => f.fileName)
            .join(", "),
          file_size: uploadedFiles.reduce(
            (sum: number, f: UploadedFileInfo) => sum + f.fileSize,
            0
          ),
          mime_type: uploadedFiles[0]?.mimeType || "application/octet-stream",
          manager_id: parseInt(formData.manager_id),
          message: formData.message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);

      // Reset form
      setFormData({
        title: "",
        description: "",
        manager_id: "",
        message: "",
      });
      setSelectedFiles([]);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/page/sell/my-documents");
      }, 2000);
    } catch (err) {
      console.error("Submit error:", err);
      setError("เกิดข้อผิดพลาดในการส่งเอกสาร");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar user={user} />
      {/* Alert container */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
        {success && (
          <Alert
            type="success"
            message="✅ ส่งเอกสารสำเร็จ!"
            onClose={() => setSuccess(false)}
          />
        )}

        {error && (
          <Alert type="error" message={error} onClose={() => setError("")} />
        )}
      </div>
      {/* Content container */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="mb-6">
          <div className="hidden md:block relative">
            <button
              onClick={() => router.push("/page/dashboard")}
              className="flex items-center gap-2 text-gray-700 font-medium px-3 py-2 rounded-xl border border-gray-100 bg-white
              shadow-sm hover:shadow-md hover:bg-gray-50 hover:text-blue-600 transition-allcursor-pointergroup cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>กลับไปหน้าหลัก</span>
            </button>

            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                ส่งเอกสารใหม่
              </h1>
              <p className="text-gray-600">
                อัพโหลดเอกสารและเลือก Manager เพื่อขออนุมัติ
              </p>
            </div>
          </div>

          {/* Mobile: Stack vertically */}
          <div className="md:hidden">
            <div className="flex justify-center mb-4">
              <button
                onClick={() => router.push("/page/dashboard")}
                className="flex items-center gap-2 text-gray-700 font-medium px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-sm 
                hover:shadow-md hover:bg-gray-50 hover:text-blue-600 transition-all cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>กลับไปหน้าหลัก</span>
              </button>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                ส่งเอกสารใหม่
              </h1>
              <p className="text-gray-600 text-sm">
                อัพโหลดเอกสารและเลือก Manager เพื่อขออนุมัติ
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 space-y-6 hover:shadow-xl transition-shadow"
        >
          {/* Title */}
          <div>
            <label className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span>ชื่อเอกสาร</span> <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-300"
              placeholder="เช่น ชื่อโปรเจกต์"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              คำอธิบาย
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none hover:border-gray-300"
              placeholder="รายละเอียดเพิ่มเติม..."
            />
          </div>

          {/* File Upload - Multiple Files with Drag & Drop */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              ไฟล์เอกสาร <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2 font-normal">
                (สูงสุด 10 ไฟล์, ไม่จำกัดขนาด)
              </span>
            </label>

            {selectedFiles.length === 0 ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  isDragging
                    ? "border-blue-500 bg-blue-50 scale-105"
                    : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/30"
                }`}
              >
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className={`p-3 rounded-xl mb-3 transition-all ${
                      isDragging 
                        ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/50 scale-110" 
                        : "bg-gradient-to-br from-blue-400 to-indigo-500 group-hover:shadow-lg group-hover:shadow-blue-500/30"
                    }`}>
                      <Upload className="w-7 h-7 text-white" />
                    </div>
                    <p className="mb-2 text-sm text-gray-700">
                      <span className="font-semibold text-blue-600">
                        คลิกเพื่อเลือกไฟล์
                      </span>{" "}
                      หรือลากไฟล์มาวาง
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, Excel, PNG, JPG, GIF (ไม่จำกัดขนาด)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.xls,.xlsx"
                    onChange={handleFileChange}
                    multiple
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                {/* File List */}
                {selectedFiles.map((file, index) => {
                  const mime = file.type;

                  const isImage = mime.startsWith("image/");
                  const isPDF = mime === "application/pdf";
                  const isExcel =
                    mime.includes("spreadsheet") || mime.includes("excel");

                  let FileIcon = FileText;
                  let iconColor = "text-gray-600";

                  if (isImage) {
                    FileIcon = ImageIcon;
                    iconColor = "text-blue-600";
                  } else if (isPDF) {
                    FileIcon = FileText;
                    iconColor = "text-red-600";
                  } else if (isExcel) {
                    FileIcon = FileSpreadsheet;
                    iconColor = "text-green-600";
                  }

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-grow min-w-0">
                        <FileIcon
                          className={`w-6 h-6 flex-shrink-0 ${iconColor}`}
                        />
                        <div className="min-w-0 flex-grow">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-500 hover:text-red-700 cursor-pointer ml-2"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  );
                })}

                {/* Add More Files Button with Drag & Drop */}
                {selectedFiles.length < 10 && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`transition-all ${
                      isDragging
                        ? "border-blue-500 bg-blue-100 scale-105"
                        : ""
                    }`}
                  >
                    <label className="flex items-center justify-center w-full p-3 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                      <Upload className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-blue-600">
                        เพิ่มไฟล์ ({selectedFiles.length}/10)
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.xls,.xlsx"
                        onChange={handleFileChange}
                        multiple
                      />
                    </label>
                  </div>
                )}

                {/* Total Size */}
                <div className="text-sm text-gray-600 text-center">
                  ขนาดรวม:{" "}
                  {(
                    selectedFiles.reduce((sum, f) => sum + f.size, 0) /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </div>
              </div>
            )}
          </div>

          {/* Manager Selection */}
          <div>
            <label className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span>เลือก Manager</span> <span className="text-red-500">*</span>
            </label>
            <select
              name="manager_id"
              value={formData.manager_id}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:border-gray-300"
              required
            >
              <option value="">-- เลือก Manager --</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name} ({manager.email})
                </option>
              ))}
            </select>
          </div>

          {/* Message to Manager */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              ความคิดเห็น
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={2}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none hover:border-gray-300"
              placeholder="ข้อความเพิ่มเติม"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={
                isSubmitting || isUploading || selectedFiles.length === 0
              }
              className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center justify-center gap-2 cursor-pointer transform hover:scale-[1.01] active:scale-[0.99]"
            >
              {isSubmitting || isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isUploading ? "กำลังอัพโหลด..." : "กำลังส่ง..."}
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  ส่งเอกสาร ({selectedFiles.length} ไฟล์)
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
