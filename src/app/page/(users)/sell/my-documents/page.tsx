"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ActivityTimeline from "@/components/ActivityTimeline";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  X,
  Loader2,
  FolderOpen,
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Image as ImageIcon,
  FileSpreadsheet,
  Package,
  ArrowUpDown,
  Layers,
} from "lucide-react";
import { userGetResponse } from "@/models/user";
import { DocumentData } from "@/models/document";
import Loading from "@/components/Loading";

interface FileData {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileOrder: number;
}

export default function MyDocuments() {
  const router = useRouter();

  const [user, setUser] = useState<userGetResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentData[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterManager, setFilterManager] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [selectedDoc, setSelectedDoc] = useState<DocumentData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<FileData[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Get unique managers from documents
  const uniqueManagers = Array.from(
    new Set(
      documents
        .filter((doc) => doc.manager_name)
        .map((doc) =>
          JSON.stringify({ name: doc.manager_name, email: doc.manager_email })
        )
    )
  ).map((item) => JSON.parse(item));

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

        if (data.user.role !== 1) {
          router.push("/page/dashboard");
        }
      }
    } catch (err) {
      console.error("Error:", err);
      router.push("/page/login");
    }
  }, [router]);

  const fetchMyDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/documents/my-documents", {
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

  const fetchDocumentFiles = async (documentId: number) => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/files`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setDocumentFiles(data.files || []);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleDownloadZip = (documentId: number) => {
    window.open(`/api/documents/${documentId}/download-zip`, "_blank");
  };

  const applyFilters = useCallback(() => {
    let filtered = [...documents];

    // Search
    if (searchTerm) {
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (doc.description &&
            doc.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((doc) => doc.status === filterStatus);
    }

    // Filter by manager
    if (filterManager !== "all") {
      filtered = filtered.filter((doc) => doc.manager_name === filterManager);
    }

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case "date":
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          compareValue = dateB - dateA;
          break;
        case "title":
          compareValue = a.title.localeCompare(b.title, "th");
          break;
        case "status":
          const statusOrder: Record<string, number> = {
            pending: 1,
            approved: 2,
            in_progress: 3,
            completed: 4,
            rejected: 5,
          };
          compareValue =
            (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
          break;
      }

      return sortOrder === "desc" ? compareValue : -compareValue;
    });

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, filterStatus, filterManager, sortBy, sortOrder]);

  useEffect(() => {
    fetchUserProfile();
    fetchMyDocuments();
  }, [fetchUserProfile, fetchMyDocuments]);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [applyFilters]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showModal) {
        setShowModal(false);
        setSelectedDoc(null);
        setDocumentFiles([]);
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [showModal]);

  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      { icon: React.ElementType; text: string; className: string }
    > = {
      pending: {
        icon: Clock,
        text: "รออนุมัติ",
        className: "bg-yellow-100 text-yellow-700",
      },
      approved: {
        icon: CheckCircle,
        text: "อนุมัติแล้ว",
        className: "bg-green-100 text-green-700",
      },
      rejected: {
        icon: XCircle,
        text: "ไม่ผ่านอนุมัติ",
        className: "bg-red-100 text-red-700",
      },
      in_progress: {
        icon: Clock,
        text: "กำลังดำเนินการ",
        className: "bg-blue-100 text-blue-700",
      },
      completed: {
        icon: CheckCircle,
        text: "เสร็จสิ้น",
        className: "bg-teal-100 text-teal-700",
      },
    };

    const badge = badges[status] || {
      icon: Clock,
      text: status,
      className: "bg-gray-100 text-gray-700",
    };
    const Icon = badge.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}
      >
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDocuments = filteredDocuments.slice(startIndex, endIndex);
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          {/* Desktop: Back button on left, title centered */}
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
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <FolderOpen className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  เอกสารของฉัน
                </h1>
              </div>
              <p className="text-gray-600">ดูเอกสารที่ส่งทั้งหมดของคุณ</p>
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
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <FolderOpen className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  เอกสารของฉัน
                </h1>
              </div>
              <p className="text-gray-600 text-sm">
                ดูเอกสารที่ส่งทั้งหมดของคุณ
              </p>
            </div>
          </div>
        </div>

        {/* Stats - Responsive Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* ทั้งหมด */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md border border-gray-100 p-3 sm:p-4 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">
                  ทั้งหมด
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {documents.length}
                </p>
              </div>

              <div className="p-2 sm:p-3 bg-gray-100 rounded-lg">
                <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </div>
            </div>
          </div>

          {/* รออนุมัติ */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-md border border-yellow-200 p-3 sm:p-4 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-yellow-700 mb-1">
                  รออนุมัติ
                </p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-700">
                  {documents.filter((d) => d.status === "pending").length}
                </p>
              </div>

              <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* อนุมัติแล้ว */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md border border-green-200 p-3 sm:p-4 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-green-700 mb-1">
                  อนุมัติแล้ว
                </p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">
                  {
                    documents.filter(
                      (d) =>
                        d.status === "approved" ||
                        d.status === "in_progress" ||
                        d.status === "completed"
                    ).length
                  }
                </p>
              </div>

              <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* ไม่ผ่านอนุมัติ */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl shadow-md border border-red-200 p-3 sm:p-4 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-red-700 mb-1">
                  ไม่ผ่านอนุมัติ
                </p>
                <p className="text-xl sm:text-2xl font-bold text-red-700">
                  {documents.filter((d) => d.status === "rejected").length}
                </p>
              </div>

              <div className="p-2 sm:p-3 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-4 hover:shadow-lg transition-shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {/* Search */}
            <div className="relative col-span-1 md:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อเอกสาร..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-300"
              />
            </div>

            {/* Manager Filter */}
            <div>
              <select
                value={filterManager}
                onChange={(e) => setFilterManager(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:border-gray-300"
              >
                <option value="all">Manager ทั้งหมด</option>
                {uniqueManagers.map((manager, index) => (
                  <option key={index} value={manager.name}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Status Filter */}
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:border-gray-300"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="pending">รออนุมัติ</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="rejected">ไม่ผ่านอนุมัติ</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="completed">เสร็จสิ้น</option>
              </select>
            </div>

            {/* Sort Options */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:border-gray-300"
              >
                <option value="date">วันที่</option>
                <option value="title">ชื่อเอกสาร</option>
                <option value="status">สถานะ</option>
              </select>
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "desc" ? "asc" : "desc")
                }
                className="px-4 py-2.5 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer"
                title={
                  sortOrder === "desc"
                    ? "เรียงจากมาก → น้อย"
                    : "เรียงจากน้อย → มาก"
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

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
            <FolderOpen className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-base sm:text-lg font-medium mb-2">
              {searchTerm || filterStatus !== "all"
                ? "ไม่พบเอกสารที่ตรงกับเงื่อนไข"
                : "ยังไม่มีเอกสาร"}
            </p>
            <p className="text-sm sm:text-base text-gray-400">
              {searchTerm || filterStatus !== "all"
                ? "ลองปรับเงื่อนไขการค้นหา"
                : "เริ่มต้นส่งเอกสารของคุณ"}
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
                    setSelectedDoc(doc);
                    setShowModal(true);
                    fetchDocumentFiles(doc.id);
                  }}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* Desktop Layout */}
                  <div className="hidden sm:flex items-start justify-between gap-4">
                    <div className="flex-grow min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                        <div className="flex-grow min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 break-words">
                            {doc.title}
                          </h3>
                          {doc.description?.trim() && (
                            <p className="text-sm text-gray-600 mb-2 break-words">
                              รายละเอียด : {doc.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 ml-8">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {new Date(doc.created_at).toLocaleDateString(
                              "th-TH",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </span>

                        {doc.manager_name && (
                          <span className="flex items-center gap-1">
                            👔
                            <span className="truncate">
                              ผู้อนุมัติเอกสาร : {doc.manager_name}
                            </span>
                          </span>
                        )}

                        {doc.engineer_name && (
                          <span className="flex items-center gap-1">
                            🔧
                            <span className="truncate">
                              มอบหมายงาน : {doc.engineer_name}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {getStatusBadge(doc.status)}

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoc(doc);
                            setShowModal(true);
                            fetchDocumentFiles(doc.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4" />
                          ดูรายละเอียด
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="sm:hidden space-y-3">
                    <div className="flex items-start gap-2">
                      <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-grow min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 mb-1 break-words">
                          {doc.title}
                        </h3>
                        {doc.description?.trim() && (
                          <p className="text-sm text-gray-600 break-words">
                            รายละเอียด : {doc.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {getStatusBadge(doc.status)}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoc(doc);
                            setShowModal(true);
                            fetchDocumentFiles(doc.id);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                        >
                          <Eye className="w-4 h-4" />
                          ดูรายละเอียด
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span className="break-words">
                          {new Date(doc.created_at).toLocaleDateString(
                            "th-TH",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>

                      {doc.manager_name && (
                        <div className="flex items-center gap-1">
                          👔
                          <span className="truncate">
                            ผู้อนุมัติเอกสาร : {doc.manager_name}
                          </span>
                        </div>
                      )}

                      {doc.engineer_name && (
                        <div className="flex items-center gap-1">
                          🔧
                          <span className="truncate">
                            มอบหมายงาน : {doc.engineer_name}
                          </span>
                        </div>
                      )}
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

                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
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
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors cursor-pointer flex-shrink-0 ${
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
                    {Math.min(endIndex, filteredDocuments.length)} จาก{" "}
                    {filteredDocuments.length} รายการ
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

        {/* Document Detail Modal */}
        {showModal && selectedDoc && (
          <div className="fixed inset-0 bg-black backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 sm:p-6">
                {/* Modal Header */}
                <div className="relative mb-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
                    รายละเอียดเอกสาร
                  </h2>

                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedDoc(null);
                      setDocumentFiles([]);
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Document Info */}
                <div className="space-y-4 mb-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 break-words">
                      {selectedDoc.title}
                    </h3>
                    {getStatusBadge(selectedDoc.status)}
                  </div>

                  {selectedDoc.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        คำอธิบาย
                      </p>
                      <p className="text-sm sm:text-base text-gray-700 break-words">
                        {selectedDoc.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">วันที่ส่ง</p>
                      <p className="font-medium break-words">
                        {new Date(selectedDoc.created_at).toLocaleDateString(
                          "th-TH",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                    {selectedDoc.manager_name && (
                      <div>
                        <p className="text-gray-500 mb-1">ผู้อนุมัติเอกสาร</p>
                        <p className="font-medium break-words">
                          {selectedDoc.manager_name}
                        </p>
                      </div>
                    )}
                    {selectedDoc.engineer_name && (
                      <div>
                        <p className="text-gray-500 mb-1">มอบหมายงาน</p>
                        <p className="font-medium break-words">
                          {selectedDoc.engineer_name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attached Files Section */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <Paperclip className="w-5 h-5 text-gray-700 flex-shrink-0" />
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
                          onClick={() => handleDownloadZip(selectedDoc.id)}
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
                <ActivityTimeline documentId={selectedDoc.id} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
