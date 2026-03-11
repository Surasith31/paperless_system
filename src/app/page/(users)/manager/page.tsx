"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  User,
  Calendar,
  Loader2,
  Download,
  Package,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  SortAsc,
  ArrowLeft,
} from "lucide-react";
import { Engineer, userGetResponse } from "@/models/user";
import ActivityTimeline from "@/components/ActivityTimeline";
import Alert from "@/components/Alert";
import { AssignedDocument, DocumentFile } from "@/models/document";
import Loading from "@/components/Loading";

export default function ManagerApprovals() {
  const router = useRouter();

  const [user, setUser] = useState<userGetResponse | null>(null);
  const [documents, setDocuments] = useState<AssignedDocument[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedDoc, setSelectedDoc] = useState<AssignedDocument | null>(null);
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const [comment, setComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");

  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // File preview states
  const [showPreview, setShowPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<AssignedDocument | null>(null);
  const [documentFiles, setDocumentFiles] = useState<DocumentFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCreator, setFilterCreator] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "title" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchUserProfile = useCallback(async () => {
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

        // Check if user is Manager
        if (data.user.role !== 2) {
          router.push("/page/dashboard");
        }
      }
    } catch (err) {
      console.error("Error:", err);
      router.push("/page/login");
    }
  }, [router]);

  const fetchPendingDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/approvals/pending", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchEngineers = useCallback(async () => {
    try {
      const response = await fetch("/api/users/engineers", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setEngineers(data.engineers || []);
      }
    } catch (err) {
      console.error("Error fetching engineers:", err);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
    fetchPendingDocuments();
    fetchEngineers();
  }, [fetchUserProfile, fetchPendingDocuments, fetchEngineers]);

  // ESC key handler for modals
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // 1. Reject Modal
        if (showRejectModal) {
          setShowRejectModal(false);
          setSelectedDoc(null);
          setRejectComment("");
          return;
        }

        // 2. Preview Modal
        if (showPreview) {
          setShowPreview(false);
          setPreviewDoc(null);
          setDocumentFiles([]);
          setCurrentFileIndex(0);
          return;
        }

        // 3. Approve Modal ⭐ (ที่ขาดไป)
        if (selectedDoc) {
          setSelectedDoc(null);
          setSelectedEngineer("");
          setComment("");
          return;
        }
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [showRejectModal, showPreview, selectedDoc]);

  async function fetchDocumentFiles(documentId: number) {
    setIsLoadingFiles(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/files`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setDocumentFiles(data.files || []);
        setCurrentFileIndex(0);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
      setDocumentFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  }

  const handlePreview = async (doc: AssignedDocument) => {
    setPreviewDoc(doc);
    setShowPreview(true);
    await fetchDocumentFiles(doc.id);
  };

  const handleDownloadZip = (documentId: number) => {
    window.open(`/api/documents/${documentId}/download-zip`, "_blank");
  };

  // Filter and Sort Functions
  const getUniqueCreators = () => {
    const creators = documents.map((doc) => doc.creator_name);
    return Array.from(new Set(creators)).sort();
  };

  const filteredAndSortedDocuments = () => {
    let filtered = [...documents];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(search) ||
          doc.description?.toLowerCase().includes(search) ||
          doc.file_name.toLowerCase().includes(search)
      );
    }

    // Creator filter
    if (filterCreator !== "all") {
      filtered = filtered.filter((doc) => doc.creator_name === filterCreator);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === "date") {
        comparison =
          new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime();
      } else if (sortBy === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === "status") {
        comparison = a.status.localeCompare(b.status);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  };

  // Pagination logic
  const allFilteredDocuments = filteredAndSortedDocuments();
  const totalPages = Math.ceil(allFilteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDocuments = allFilteredDocuments.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCreator, sortBy, sortOrder]);

  const handleApprove = async () => {
    if (!selectedDoc) return;

    setError("");
    setSuccess("");
    setIsApproving(true);

    try {
      const response = await fetch("/api/approvals/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          document_id: selectedDoc.id,
          engineer_id: selectedEngineer ? parseInt(selectedEngineer) : null,
          comment: comment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        setIsApproving(false);
        return;
      }

      setSuccess("อนุมัติเอกสารสำเร็จ!");
      setSelectedDoc(null);
      setSelectedEngineer("");
      setComment("");

      // Refresh documents list
      await fetchPendingDocuments();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Approve error:", err);
      setError("เกิดข้อผิดพลาดในการอนุมัติ");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDoc || !rejectComment.trim()) {
      setError("กรุณาระบุเหตุผลในการไม่ผ่านอนุมัติ");
      return;
    }

    setError("");
    setSuccess("");
    setIsRejecting(true);

    try {
      const response = await fetch("/api/approvals/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          document_id: selectedDoc.id,
          comment: rejectComment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "เกิดข้อผิดพลาด");
        setIsRejecting(false);
        return;
      }

      setSuccess("ไม่ผ่านอนุมัติเอกสารสำเร็จ");
      setShowRejectModal(false);
      setSelectedDoc(null);
      setRejectComment("");

      // Refresh documents list
      await fetchPendingDocuments();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Reject error:", err);
      setError("เกิดข้อผิดพลาดในการไม่ผ่านอนุมัติ");
    } finally {
      setIsRejecting(false);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar user={user} />
      {/* Success/Error Messages */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
        {success && (
          <Alert
            type="success"
            message={"✅ อนุมัติเรียบร้อย"}
            onClose={() => setError("")}
          />
        )}

        {error && (
          <Alert type="error" message={error} onClose={() => setError("")} />
        )}
      </div>
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="mb-8">
          {/* Desktop: Back button on left, title centered */}
          <div className="hidden md:block relative">
            <button
              onClick={() => router.push("/page/dashboard")}
              className="flex items-center gap-2 text-gray-700 font-medium px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-sm 
                hover:shadow-md hover:bg-gray-50 hover:text-blue-600 transition-all cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">กลับไปหน้าหลัก</span>
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="p-2 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  เอกสารรออนุมัติ
                </h1>
              </div>
              <p className="text-gray-600">
                ตรวจสอบและอนุมัติเอกสารจากพนักงานขาย
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
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="p-2 bg-linear-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  เอกสารรออนุมัติ
                </h1>
              </div>
              <p className="text-gray-600 text-sm">
                ตรวจสอบและอนุมัติเอกสารจากพนักงานขาย
              </p>
            </div>
          </div>
        </div>

        {/* Search & Filter Section */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-4  transition-shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Search Bar */}
            <div className="md:col-span-2 lg:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อเอกสาร..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Filter by Creator */}
            <div className="md:col-span-1 lg:col-span-2">
              <select
                value={filterCreator}
                onChange={(e) => setFilterCreator(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">ผู้ขออนุมัติเอกสารทั้งหมด</option>
                {getUniqueCreators().map((creator) => (
                  <option key={creator} value={creator}>
                    {creator}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="md:col-span-1 lg:col-span-1">
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "date" | "title" | "status")
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="date">วันที่</option>
                  <option value="title">ชื่อเอกสาร</option>
                  <option value="status">สถานะ</option>
                </select>
                <button
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  title={
                    sortOrder === "asc"
                      ? "เรียงจากน้อยไปมาก"
                      : "เรียงจากมากไปน้อย"
                  }
                >
                  <SortAsc
                    className={`w-5 h-5 ${
                      sortOrder === "desc" ? "rotate-180" : ""
                    } transition-transform`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Documents List */}
        {filteredAndSortedDocuments().length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {documents.length === 0
                ? "ไม่มีเอกสารรออนุมัติ"
                : "ไม่พบเอกสารที่ตรงกับเงื่อนไข"}
            </h3>
            <p className="text-gray-500">
              {documents.length === 0
                ? "ยังไม่มีเอกสารที่รอการอนุมัติจากคุณในขณะนี้"
                : "ลองเปลี่ยนเงื่อนไขการค้นหาหรือกรองใหม่"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {currentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={(e) => {
                    e.preventDefault();
                    handlePreview(doc);
                  }}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Document Info */}
                      <div className="flex items-start gap-4 mb-4">
                        <FileText className="w-12 h-12 text-blue-600 shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {doc.title}
                          </h3>
                          {doc.description?.trim() && (
                            <p className="text-gray-600 mb-3">
                              รายละเอียด : {doc.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {doc.creator_name}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(doc.assigned_at).toLocaleDateString(
                                "th-TH",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(doc);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          ดูไฟล์ทั้งหมด
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadZip(doc.id);
                          }}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <Package className="w-4 h-4" />
                          ดาวน์โหลด ZIP
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoc(doc);
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          อนุมัติ
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoc(doc);
                            setShowRejectModal(true);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          ไม่ผ่านอนุมัติ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                {/* Mobile Pagination */}
                <div className="sm:hidden space-y-3">
                  <div className="text-sm text-gray-600 text-center">
                    หน้า {currentPage} จาก {totalPages}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      ก่อนหน้า
                    </button>

                    <div className="flex items-center gap-1 overflow-x-auto">
                      {Array.from(
                        { length: Math.min(totalPages, 5) },
                        (_, i) => {
                          let page;
                          if (totalPages <= 5) {
                            page = i + 1;
                          } else if (currentPage <= 3) {
                            page = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            page = totalPages - 4 + i;
                          } else {
                            page = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                currentPage === page
                                  ? "bg-blue-600 text-white"
                                  : "hover:bg-gray-100 text-gray-700"
                              }`}
                            >
                              {page}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm"
                    >
                      ถัดไป
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Desktop Pagination */}
                <div className="hidden sm:flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    แสดง {startIndex + 1}-
                    {Math.min(endIndex, allFilteredDocuments.length)} จาก{" "}
                    {allFilteredDocuments.length} รายการ
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                              currentPage === page
                                ? "bg-blue-600 text-white"
                                : "hover:bg-gray-100 text-gray-700"
                            }`}
                          >
                            {page}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* File Preview Modal */}
        {showPreview && previewDoc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="relative mb-6 border-b pb-4">
                  {/* ปุ่มปิด มุมขวาสุด */}
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      setPreviewDoc(null);
                      setDocumentFiles([]);
                      setCurrentFileIndex(0);
                    }}
                    className="absolute right-0 top-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  {/* Content กลาง */}
                  <div className="text-center px-10">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {previewDoc.title}
                    </h2>

                    {previewDoc.description?.trim() && (
                      <p className="text-gray-600 mt-2">
                        รายละเอียด : {previewDoc.description}
                      </p>
                    )}

                    <p className="text-sm text-gray-500 mt-1">
                      โดย : {previewDoc.creator_name}
                    </p>
                  </div>
                </div>

                {isLoadingFiles ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                  </div>
                ) : documentFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">ไม่พบไฟล์</p>
                  </div>
                ) : (
                  <>
                    {/* File Navigator */}
                    {documentFiles.length > 1 && (
                      <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg">
                        <button
                          onClick={() =>
                            setCurrentFileIndex(
                              Math.max(0, currentFileIndex - 1)
                            )
                          }
                          disabled={currentFileIndex === 0}
                          className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="text-center">
                          <p className="font-semibold text-gray-900 text-sm">
                            {documentFiles[currentFileIndex]?.fileName}
                          </p>
                          <p className="text-sm text-gray-500">
                            ไฟล์ {currentFileIndex + 1} จาก{" "}
                            {documentFiles.length} (
                            {(
                              (documentFiles[currentFileIndex]?.fileSize ?? 0) /
                              1024
                            ).toFixed(2)}{" "}
                            KB)
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            setCurrentFileIndex(
                              Math.min(
                                documentFiles.length - 1,
                                currentFileIndex + 1
                              )
                            )
                          }
                          disabled={
                            currentFileIndex === documentFiles.length - 1
                          }
                          className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    {/* File Preview */}
                    <div className="bg-gray-100 rounded-lg p-4 mb-4 min-h-[400px] flex items-center justify-center">
                      {documentFiles[currentFileIndex]?.mimeType.startsWith(
                        "image/"
                      ) ? (
                        <div className="relative w-full max-w-full h-[400px]">
                          <Image
                            src={documentFiles[currentFileIndex]?.url || ""}
                            alt={
                              documentFiles[currentFileIndex]?.fileName ||
                              "Preview"
                            }
                            fill
                            unoptimized
                            style={{ objectFit: "contain" }}
                          />
                        </div>
                      ) : documentFiles[currentFileIndex]?.mimeType ===
                        "application/pdf" ? (
                        <iframe
                          src={documentFiles[currentFileIndex]?.url}
                          className="w-full h-[600px] rounded-lg"
                          title="PDF Preview"
                        />
                      ) : (
                        <div className="text-center">
                          <FileText
                            className={`w-16 h-16 mx-auto mb-4 ${
                              documentFiles[
                                currentFileIndex
                              ]?.mimeType.includes("excel") ||
                              documentFiles[
                                currentFileIndex
                              ]?.mimeType.includes("spreadsheet")
                                ? "text-green-600"
                                : "text-gray-400"
                            }`}
                          />
                          <p className="text-gray-900 font-semibold mb-1">
                            {documentFiles[currentFileIndex]?.fileName}
                          </p>
                          <p className="text-gray-600 mb-4">
                            {documentFiles[currentFileIndex]?.mimeType.includes(
                              "excel"
                            ) ||
                            documentFiles[currentFileIndex]?.mimeType.includes(
                              "spreadsheet"
                            )
                              ? "ไฟล์ Excel - กรุณาดาวน์โหลดเพื่อดูเนื้อหา"
                              : "ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้"}
                          </p>
                          <a
                            href={documentFiles[currentFileIndex]?.url}
                            download={documentFiles[currentFileIndex]?.fileName}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                            ดาวน์โหลดไฟล์
                          </a>
                        </div>
                      )}
                    </div>

                    {/* File List */}
                    {documentFiles.length > 1 && (
                      <div className="pt-4">
                        <h3 className="font-semibold text-gray-900 mb-3">
                          ไฟล์ทั้งหมด ({documentFiles.length} ไฟล์)
                        </h3>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          {documentFiles.map((file, index) => (
                            <button
                              key={file.id}
                              onClick={() => setCurrentFileIndex(index)}
                              className={`p-2 text-left rounded-lg text-sm transition-colors cursor-pointer ${
                                index === currentFileIndex
                                  ? "bg-blue-100 border border-blue-500"
                                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              <p className="font-medium text-gray-900 truncate">
                                {file.fileName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.fileSize / 1024).toFixed(2)} KB
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Download All Button */}
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => handleDownloadZip(previewDoc.id)}
                        className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2 cursor-pointer text-sm"
                      >
                        <Package className="w-5 h-5" />
                        ดาวน์โหลดทั้งหมด (ZIP)
                      </button>
                    </div>
                  </>
                )}

                {/* Activity Timeline */}
                {previewDoc && (
                  <div className="mt-4">
                    <ActivityTimeline documentId={previewDoc.id} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approve Modal */}
        {selectedDoc && !showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scaleIn">
              <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-center text-gray-900">
                    อนุมัติเอกสาร
                  </h2>

                  <p className="text-sm text-gray-500 text-center mt-1">
                    กรุณาตรวจสอบข้อมูลก่อนอนุมัติ
                  </p>
                </div>

                {/* Document Info */}
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <h3 className="font-semibold text-gray-900">
                    {selectedDoc.title}
                  </h3>
                  {selectedDoc.description?.trim() && (
                    <p className="text-sm text-gray-600 mt-2">
                      รายละเอียด : {selectedDoc.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    จาก: {selectedDoc.creator_name}
                  </p>
                </div>

                {/* Engineer Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เลือก Engineer (ไม่บังคับ)
                  </label>
                  <select
                    value={selectedEngineer}
                    onChange={(e) => setSelectedEngineer(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 
                       bg-white cursor-pointer"
                  >
                    <option value="">-- ไม่ส่งต่อให้ Engineer --</option>
                    {engineers.map((engineer) => (
                      <option key={engineer.id} value={engineer.id}>
                        {engineer.name} ({engineer.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    หากไม่เลือก Engineer เอกสารจะถูกอนุมัติและจบ workflow
                  </p>
                </div>

                {/* Comment */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ความคิดเห็น
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ความคิดเห็นเพิ่มเติม"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  {/* Approve Button */}
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium 
                       hover:bg-green-700 disabled:opacity-50 transition-all flex 
                       items-center justify-center gap-2 cursor-pointer"
                  >
                    {isApproving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        กำลังอนุมัติ...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        อนุมัติเอกสาร
                      </>
                    )}
                  </button>

                  {/* Cancel Button */}
                  <button
                    onClick={() => {
                      setSelectedDoc(null);
                      setSelectedEngineer("");
                      setComment("");
                    }}
                    disabled={isApproving}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scaleIn">
              <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-center text-gray-900">
                    ไม่ผ่านอนุมัติเอกสาร
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 text-center">
                    กรุณาระบุเหตุผลในการไม่อนุมัติ
                  </p>
                </div>

                {/* Document Info */}
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <h3 className="font-semibold text-gray-900">
                    {selectedDoc.title}
                  </h3>
                  {selectedDoc.description?.trim() && (
                    <p className="text-sm text-gray-600 mt-2">
                      รายละเอียด : {selectedDoc.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    จาก : {selectedDoc.creator_name}
                  </p>
                </div>

                {/* Reject Reason */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    เหตุผลในการไม่อนุมัติ{" "}
                    <span className="text-red-500">*</span>
                  </label>

                  <textarea
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="กรุณาระบุเหตุผลในการไม่ผ่านอนุมัติ..."
                    required
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  {/* Reject Button */}
                  <button
                    onClick={handleReject}
                    disabled={isRejecting || !rejectComment.trim()}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-medium 
                       hover:bg-red-700 disabled:opacity-50 transition-all flex 
                       items-center justify-center gap-2 cursor-pointer"
                  >
                    {isRejecting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        กำลังดำเนินการ...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5" />
                        ไม่ผ่านอนุมัติเอกสาร
                      </>
                    )}
                  </button>

                  {/* Cancel Button */}
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setSelectedDoc(null);
                      setRejectComment("");
                    }}
                    disabled={isRejecting}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium 
                       hover:bg-gray-300 transition-all cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
