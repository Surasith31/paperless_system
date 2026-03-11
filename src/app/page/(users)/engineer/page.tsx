"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  FileText,
  Calendar,
  Loader2,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle,
  Package,
  Zap,
  Target,
  ArrowUpDown,
  ArrowLeft,
  Paperclip,
  ImageIcon,
  FileSpreadsheet,
} from "lucide-react";
import { userGetResponse } from "@/models/user";
import ActivityTimeline from "@/components/ActivityTimeline";
import { AssignedDocument, DocumentFile } from "@/models/document";
import Alert from "@/components/Alert";
import Loading from "@/components/Loading";

export default function EngineerTasks() {
  const router = useRouter();

  const [user, setUser] = useState<userGetResponse | null>(null);
  const [documents, setDocuments] = useState<AssignedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // File preview states
  const [showPreview, setShowPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<AssignedDocument | null>(null);
  const [documentFiles, setDocumentFiles] = useState<DocumentFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Tab state - แสดงงานตาม status
  const [activeTab, setActiveTab] = useState<
    "all" | "in_progress" | "completed"
  >("all");

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCreator, setFilterCreator] = useState("all");
  const [filterAssignedBy, setFilterAssignedBy] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "title" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Status update states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedDocForStatus, setSelectedDocForStatus] =
    useState<AssignedDocument | null>(null);
  const [newStatus, setNewStatus] = useState<"in_progress" | "completed">(
    "in_progress",
  );
  const [statusComment, setStatusComment] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");

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

          // Check if user is Engineer
          if (data.user.role !== 3) {
            router.push("/page/dashboard");
          }
        }
      } catch (err) {
        console.error("Error:", err);
        router.push("/page/login");
      }
    }

    async function fetchAssignedDocuments() {
      try {
        const response = await fetch("/api/documents/assigned", {
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
    }

    fetchUserProfile();
    fetchAssignedDocuments();
  }, [router]);

  // ESC key handler for modals
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showStatusModal) {
          setShowStatusModal(false);
          setSelectedDocForStatus(null);
          setStatusError("");
        } else if (showPreview) {
          setShowPreview(false);
          setPreviewDoc(null);
          setDocumentFiles([]);
          setCurrentFileIndex(0);
        }
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [showStatusModal, showPreview]);

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

  // Status Update Functions
  const handleOpenStatusModal = (
    doc: AssignedDocument,
    status: "in_progress" | "completed",
  ) => {
    setSelectedDocForStatus(doc);
    setNewStatus(status);
    setStatusComment(""); // Reset comment
    setShowStatusModal(true);
    setStatusError("");
  };

  const handleUpdateStatus = async () => {
    if (!selectedDocForStatus) return;

    setIsUpdatingStatus(true);
    setStatusError("");
    setStatusSuccess("");

    try {
      const response = await fetch(
        `/api/documents/${selectedDocForStatus.id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            status: newStatus,
            comment: statusComment.trim() || undefined, // ส่ง comment ถ้ามี
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setStatusError(data.error || "เกิดข้อผิดพลาด");
        setIsUpdatingStatus(false);
        return;
      }

      setStatusSuccess(
        newStatus === "in_progress"
          ? "เริ่มดำเนินการงานแล้ว"
          : "ทำงานเสร็จสิ้นแล้ว",
      );
      setShowStatusModal(false);
      setSelectedDocForStatus(null);
      setStatusComment(""); // Reset comment

      // Refresh documents list
      const docsResponse = await fetch("/api/documents/assigned", {
        credentials: "include",
      });

      if (docsResponse.ok) {
        const docsData = await docsResponse.json();
        setDocuments(docsData.documents || []);
      }

      setTimeout(() => setStatusSuccess(""), 3000);
    } catch (err) {
      console.error("Status update error:", err);
      setStatusError("เกิดข้อผิดพลาดในการอัพเดทสถานะ");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border-orange-200";
      case "completed":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200";
      case "approved":
        return "bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border-blue-200";
      default:
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border-gray-200";
    }
  };
  const getCardColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200";
      case "completed":
        return "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200";
      case "approved":
        return "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200";
      default:
        return "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in_progress":
        return "กำลังดำเนินการ";
      case "completed":
        return "เสร็จสิ้น";
      case "approved":
        return "อนุมัติแล้ว";
      default:
        return status;
    }
  };

  // Filter and Sort Functions
  const getUniqueCreators = () => {
    const creators = documents.map((doc) => doc.creator_name);
    return Array.from(new Set(creators)).sort();
  };

  const getUniqueAssigners = () => {
    const assigners = documents.map((doc) => doc.assigned_by_name);
    return Array.from(new Set(assigners)).sort();
  };

  const filteredAndSortedDocuments = () => {
    let filtered = [...documents];

    // Filter by active tab FIRST
    if (activeTab === "in_progress") {
      filtered = filtered.filter((doc) => doc.status === "in_progress");
    } else if (activeTab === "completed") {
      filtered = filtered.filter((doc) => doc.status === "completed");
    }
    // activeTab === "all" แสดงทุกสถานะ

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(search) ||
          doc.description?.toLowerCase().includes(search) ||
          doc.creator_name.toLowerCase().includes(search) ||
          doc.assigned_by_name.toLowerCase().includes(search),
      );
    }

    // Creator filter
    if (filterCreator !== "all") {
      filtered = filtered.filter((doc) => doc.creator_name === filterCreator);
    }

    // Assigned by filter
    if (filterAssignedBy !== "all") {
      filtered = filtered.filter(
        (doc) => doc.assigned_by_name === filterAssignedBy,
      );
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
  const totalPages = Math.ceil(
    filteredAndSortedDocuments().length / itemsPerPage,
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDocuments = filteredAndSortedDocuments().slice(
    startIndex,
    endIndex,
  );

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Get counts for tabs
  const getTabCounts = () => {
    return {
      all: documents.length,
      in_progress: documents.filter((doc) => doc.status === "in_progress")
        .length,
      completed: documents.filter((doc) => doc.status === "completed").length,
    };
  };

  if (isLoading) {
    return <Loading />;
  }

  const tabCounts = getTabCounts();
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar user={user} />

      {/* Success Alert */}
      {statusSuccess && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top duration-300">
          <Alert
            type="success"
            message={statusSuccess}
            onClose={() => setStatusSuccess("")}
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-6">
          {/*  Desktop Layout  */}
          <div className="hidden md:block relative">
            {/* Back Button (Desktop - Left) */}
            <button
              onClick={() => router.push("/page/dashboard")}
              className="flex items-center gap-2 text-gray-700 font-medium px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-sm 
                hover:shadow-md hover:bg-gray-50 hover:text-blue-600 transition-all cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">กลับไปหน้าหลัก</span>
            </button>

            {/* Title + Subtitle Centered */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  งานของฉัน
                </h1>
              </div>

              <p className="text-gray-600">
                จัดการและติดตามงานที่ได้รับมอบหมาย
              </p>
            </div>
          </div>

          {/*  Mobile Layout  */}
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
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  งานของฉัน
                </h1>
              </div>

              <p className="text-gray-600 text-sm">
                จัดการและติดตามงานที่ได้รับมอบหมาย
              </p>
            </div>
          </div>

          {/* Stats - ปรับ Layout ให้เหมือนตัวอย่างใหม่ */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-8">
            {/* งานทั้งหมด */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-blue-100 p-3 sm:p-4 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">
                    งานทั้งหมด
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {tabCounts.all}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </div>

            {/* กำลังดำเนินการ */}
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl shadow-lg border border-orange-200 p-3 sm:p-4 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-orange-700 mb-1">
                    กำลังดำเนินการ
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">
                    {tabCounts.in_progress}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-orange-100 rounded-lg">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
              </div>
            </div>

            {/* เสร็จสิ้นแล้ว */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg border border-green-200 p-3 sm:p-4 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-green-700 mb-1">
                    เสร็จสิ้นแล้ว
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {tabCounts.completed}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4  grid gap-2  grid-cols-3 md:grid-cols-3 mt-6 mb-4">
          <button
            onClick={() => {
              setActiveTab("all");
              setCurrentPage(1);
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
              activeTab === "all"
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            งานทั้งหมด ({tabCounts.all})
          </button>
          <button
            onClick={() => {
              setActiveTab("in_progress");
              setCurrentPage(1);
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
              activeTab === "in_progress"
                ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            กำลังดำเนินการ ({tabCounts.in_progress})
          </button>
          <button
            onClick={() => {
              setActiveTab("completed");
              setCurrentPage(1);
            }}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
              activeTab === "completed"
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            เสร็จสิ้นแล้ว ({tabCounts.completed})
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 ">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาชื่อ , รายละเอียด , ผู้สร้างเอกสาร หรือ ผู้อนุมัติ ..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Creator Filter */}
            <div>
              <select
                value={filterCreator}
                onChange={(e) => {
                  setFilterCreator(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="all">ผู้สร้างเอกสารทั้งหมด</option>
                {getUniqueCreators().map((creator) => (
                  <option key={creator} value={creator}>
                    {creator}
                  </option>
                ))}
              </select>
            </div>

            {/* Manager (Assigned By) Filter */}
            <div>
              <select
                value={filterAssignedBy}
                onChange={(e) => {
                  setFilterAssignedBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="all">ผู้อนุมัติทั้งหมด</option>
                {getUniqueAssigners().map((assigner) => (
                  <option key={assigner} value={assigner}>
                    {assigner}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "date" | "title" | "status")
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  <option value="date">วันที่</option>
                  <option value="title">ชื่อ</option>
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
                  <ArrowUpDown
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
        <div className="space-y-4">
          {currentDocuments.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                ไม่พบงาน
              </h3>
              <p className="text-gray-600">
                {searchTerm || filterCreator !== "all"
                  ? "ลองปรับเปลี่ยนการค้นหาหรือตัวกรอง"
                  : "คุณยังไม่มีงานที่ได้รับมอบหมาย"}
              </p>
            </div>
          ) : (
            currentDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={(e) => {
                  e.preventDefault();
                  handlePreview(doc);
                }}
                className={`rounded-2xl shadow-sm p-6 hover:shadow-md transition-all duration-200 cursor-pointer border ${getCardColor(
                  doc.status,
                )}`}
              >
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <FileText className="w-6 h-6 text-blue-600" />

                    <h3 className="text-lg md:text-xl font-semibold text-gray-900">
                      {doc.title}
                    </h3>

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                        doc.status,
                      )}`}
                    >
                      {getStatusText(doc.status)}
                    </span>
                  </div>
                </div>

                {/* Description — ปรับให้เนียนขึ้น */}
                {doc.description?.trim() && (
                  <div className="mb-5">
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed bg-white/40 backdrop-blur-sm p-3 rounded-lg border border-gray-100 shadow-sm">
                      <span className="font-medium text-gray-800">
                        รายละเอียด :
                      </span>{" "}
                      {doc.description}
                    </p>
                  </div>
                )}

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>
                      💼 สร้างโดย :{" "}
                      <strong className="text-gray-800">
                        {doc.creator_name}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>
                      👔 มอบหมายโดย :{" "}
                      <strong className="text-gray-800">
                        {doc.assigned_by_name}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-800">
                      {new Date(doc.assigned_at).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  {doc.completed_at && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-green-500" />
                      <span className="text-gray-800">
                        {new Date(doc.completed_at).toLocaleDateString(
                          "th-TH",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(doc);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    ดูไฟล์
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadZip(doc.id);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    ดาวน์โหลด ZIP
                  </button>

                  {doc.status !== "in_progress" &&
                    doc.status !== "completed" &&
                    doc.status !== "approved" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStatusModal(doc, "in_progress");
                        }}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4" />
                        เริ่มดำเนินการ
                      </button>
                    )}

                  {doc.status === "in_progress" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenStatusModal(doc, "completed");
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      ทำงานเสร็จแล้ว
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
            {/* Mobile Pagination */}
            <div className="sm:hidden space-y-3">
              <div className="text-sm text-gray-600 text-center font-medium">
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
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                  })}
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
                {Math.min(endIndex, filteredAndSortedDocuments().length)} จาก{" "}
                {filteredAndSortedDocuments().length} รายการ
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
                    ),
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
      </div>

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
                    <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-xl">
                      <button
                        onClick={() =>
                          setCurrentFileIndex(Math.max(0, currentFileIndex - 1))
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
                          ไฟล์ {currentFileIndex + 1} จาก {documentFiles.length}{" "}
                          (
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
                              currentFileIndex + 1,
                            ),
                          )
                        }
                        disabled={currentFileIndex === documentFiles.length - 1}
                        className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* File Preview */}
                  <div className="bg-gray-100 rounded-xl p-4 mb-4 min-h-[400px] flex items-center justify-center">
                    {documentFiles[currentFileIndex]?.mimeType.startsWith(
                      "image/",
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
                        className="w-full h-[600px] rounded-lg "
                        title="PDF Preview"
                      />
                    ) : (
                      <div className="text-center">
                        <FileText
                          className={`w-16 h-16 mx-auto mb-4 ${
                            documentFiles[currentFileIndex]?.mimeType.includes(
                              "excel",
                            ) ||
                            documentFiles[currentFileIndex]?.mimeType.includes(
                              "spreadsheet",
                            )
                              ? "text-green-600"
                              : "text-gray-400"
                          }`}
                        />
                        <p className="text-gray-900 font-semibold mb-1">
                          {documentFiles[currentFileIndex]?.fileName}
                        </p>
                        <p className="text-gray-600 mb-4">
                          {documentFiles[currentFileIndex]?.mimeType.includes(
                            "excel",
                          ) ||
                          documentFiles[currentFileIndex]?.mimeType.includes(
                            "spreadsheet",
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

      {/* File Preview Modal */}
      {showPreview && previewDoc?.status == "completed" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Modal Header */}
              <div className="relative mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
                  รายละเอียดเอกสาร
                </h2>

                <button
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewDoc(null);
                    setDocumentFiles([]);
                    setCurrentFileIndex(0);
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Document Info */}
              <div className="space-y-4 mb-6">
                {previewDoc.description && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 break-words">
                      {previewDoc.title}
                    </h3>
                    <p className="text-sm font-medium text-gray-500 mb-1">
                      รายละเอียด
                    </p>
                    <p className="text-sm sm:text-base text-gray-700 break-words">
                      {previewDoc.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">ผู้ส่งเอกสาร</p>
                    <p className="font-medium break-words">
                      {previewDoc.creator_name}
                    </p>
                  </div>

                  {previewDoc.assigned_by_name && (
                    <div>
                      <p className="text-gray-500 mb-1">มอบหมายโดย</p>
                      <p className="font-medium break-words">
                        {previewDoc.assigned_by_name}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500 mb-1">วันที่มอบหมาย</p>
                    <p className="font-medium break-words">
                      {(() => {
                        const dateStr = previewDoc.assigned_at;
                        if (!dateStr) return "N/A";
                        return new Date(dateStr).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        });
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">
                      {previewDoc.status === "completed"
                        ? "วันที่ทำงานเสร็จ"
                        : ""}
                    </p>
                    <p className="font-medium break-words">
                      {(() => {
                        const dateStr = previewDoc.completed_at;
                        if (!dateStr) return "N/A";
                        return new Date(dateStr).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        });
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attached Files Section */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-4">
                  <Paperclip className="w-5 h-5 text-gray-700" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    ไฟล์แนบ
                  </h3>
                  {documentFiles.length > 0 && (
                    <span className="text-sm text-gray-500">
                      ({documentFiles.length} ไฟล์)
                    </span>
                  )}
                </div>

                {isLoadingFiles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : documentFiles.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <Paperclip className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm sm:text-base">
                      ไม่มีไฟล์แนบ
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documentFiles.map((file) => {
                      const isImage = file.mimeType.startsWith("image/");
                      const isPDF = file.mimeType === "application/pdf";
                      const isExcel =
                        file.mimeType.includes("spreadsheet") ||
                        file.mimeType.includes("excel");

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
                          key={file.id}
                          className="flex items-center justify-between gap-2 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2 sm:gap-3 flex-grow min-w-0">
                            <FileIcon
                              className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${iconColor}`}
                            />
                            <div className="min-w-0 flex-grow">
                              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                {file.fileName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.fileSize / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>

                          <a
                            href={`/api/files/${file.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                          >
                            <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">ดูไฟล์</span>
                            <span className="sm:hidden">ดู</span>
                          </a>
                        </div>
                      );
                    })}
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => handleDownloadZip(previewDoc.id)}
                        className="flex-1 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
                      >
                        <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                        ดาวน์โหลดทั้งหมด (ZIP)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Activity Timeline */}
              <ActivityTimeline documentId={previewDoc.id} />
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedDocForStatus && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden animate-fadeIn">
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                {newStatus === "in_progress" ? (
                  <Play className="w-6 h-6 text-orange-500" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                )}
                {newStatus === "in_progress"
                  ? "เริ่มดำเนินการงาน"
                  : "ยืนยันการเสร็จสิ้นงาน"}
              </h3>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-gray-700 leading-relaxed mb-5">
                คุณต้องการ
                <span className="font-semibold text-gray-800 mx-1">
                  {newStatus === "in_progress"
                    ? "เริ่มดำเนินการ"
                    : "ยืนยันว่าทำงานเสร็จสิ้น"}
                </span>
                งาน
                <span className="font-semibold text-gray-900">
                  {" "}
                  {selectedDocForStatus.title}{" "}
                </span>
                ใช่หรือไม่?
              </p>

              {/* Comment Input - แสดงเฉพาะเมื่อทำงานเสร็จ */}
              {newStatus === "completed" && (
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ความคิดเห็น (ไม่บังคับ)
                  </label>
                  <textarea
                    value={statusComment}
                    onChange={(e) => setStatusComment(e.target.value)}
                    placeholder="เพิ่มความคิดเห็นหรือหมายเหตุ..."
                    rows={3}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-400 transition-all resize-none hover:border-gray-300"
                  />
                </div>
              )}

              {/* Error */}
              {statusError && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-700 text-sm">{statusError}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 mt-2">
                {/* Confirm Button */}
                <button
                  onClick={handleUpdateStatus}
                  disabled={isUpdatingStatus}
                  className={`flex-1 px-4 py-3 rounded-xl text-white text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer
              ${
                newStatus === "in_progress"
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                  : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isUpdatingStatus ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      กำลังอัพเดท...
                    </>
                  ) : (
                    <>
                      {newStatus === "in_progress" ? (
                        <Play className="w-5 h-5" />
                      ) : (
                        <CheckCircle className="w-5 h-5" />
                      )}
                      ยืนยัน
                    </>
                  )}
                </button>

                {/* Cancel Button */}
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedDocForStatus(null);
                    setStatusComment(""); // Reset comment
                    setStatusError("");
                  }}
                  disabled={isUpdatingStatus}
                  className="flex-1 px-4 py-3 text-sm font-medium border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
