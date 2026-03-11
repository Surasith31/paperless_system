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
  History,
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
import { ApprovalData } from "@/models/workflow";
import { DocumentFile } from "@/models/document";
import Loading from "@/components/Loading";

export default function ApprovalHistory() {
  const router = useRouter();

  const [user, setUser] = useState<userGetResponse | null>(null);
  const [approvals, setApprovals] = useState<ApprovalData[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<ApprovalData[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [selectedApproval, setSelectedApproval] = useState<ApprovalData | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const [documentFiles, setDocumentFiles] = useState<DocumentFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/profile", {
        credentials: "include",
      });
      if (!response.ok) return router.push("/page/login");
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
        if (data.user.role !== 2) router.push("/page/dashboard");
      }
    } catch (err) {
      console.error("Error:", err);
      router.push("/page/login");
    }
  }, [router]);

  const fetchApprovalHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/approvals/history", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch approval history");
      const data = await response.json();
      if (data.success) setApprovals(data.approvals || []);
      else throw new Error(data.message || "Failed to load data");
    } catch (err) {
      console.error("Error fetching approval history:", err);
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
    let filtered = [...approvals];

    if (searchTerm) {
      filtered = filtered.filter(
        (approval) =>
          approval.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          approval.creator_name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          approval.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((approval) => {
        if (filterStatus === "approved" || filterStatus === "rejected")
          return approval.approval_status === filterStatus;
        if (filterStatus === "in_progress" || filterStatus === "completed")
          return approval.document_status === filterStatus;
        return true;
      });
    }

    filtered.sort((a, b) => {
      let compareValue = 0;
      switch (sortBy) {
        case "date":
          const dateA = new Date(a.approved_at || a.rejected_at || 0).getTime();
          const dateB = new Date(b.approved_at || b.rejected_at || 0).getTime();
          compareValue = dateB - dateA;
          break;
        case "title":
          compareValue = (a.title || "").localeCompare(b.title || "", "th");
          break;
        case "status":
          const statusOrder: Record<string, number> = {
            approved: 1,
            rejected: 2,
          };
          compareValue =
            (statusOrder[a.approval_status] || 99) -
            (statusOrder[b.approval_status] || 99);
          break;
      }
      return sortOrder === "desc" ? compareValue : -compareValue;
    });

    setFilteredApprovals(filtered);
  }, [approvals, searchTerm, filterStatus, sortBy, sortOrder]);

  useEffect(() => {
    fetchUserProfile();
    fetchApprovalHistory();
  }, [fetchUserProfile, fetchApprovalHistory]);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [applyFilters]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showModal) {
        setShowModal(false);
        setSelectedApproval(null);
        setDocumentFiles([]);
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [showModal]);

  const getStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" />
          อนุมัติแล้ว
        </span>
      );
    } else if (status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" />
          ไม่ผ่านอนุมัติ
        </span>
      );
    }
    return null;
  };

  const getDocumentStatusBadge = (docStatus: string) => {
    const badges: Record<
      string,
      { icon: React.ElementType; text: string; className: string }
    > = {
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
      approved: {
        icon: CheckCircle,
        text: "รอมอบหมาย",
        className: "bg-yellow-100 text-yellow-700",
      },
      rejected: {
        icon: XCircle,
        text: "ไม่ผ่านการอนุมัติ",
        className: "bg-red-100 text-red-700",
      },
    };

    const badge = badges[docStatus];
    if (!badge) return null;

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

  // Pagination logic
  const totalPages = Math.ceil(filteredApprovals.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentApprovals = filteredApprovals.slice(startIndex, endIndex);

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
              className="flex items-center gap-2 text-gray-700 font-medium px-4 py-2 rounded-xl border border-gray-200 bg-white shadow-sm 
                hover:shadow-md hover:bg-gray-50 hover:text-blue-600 transition-all cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">กลับไปหน้าหลัก</span>
            </button>

            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <History className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ประวัติการอนุมัติ
                </h1>
              </div>
              <p className="text-gray-600">
                ดูเอกสารที่อนุมัติหรือไม่ผ่านอนุมัติทั้งหมด
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
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <History className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  ประวัติการอนุมัติ
                </h1>
              </div>
              <p className="text-gray-600 text-sm">
                ดูเอกสารที่อนุมัติหรือไม่ผ่านอนุมัติทั้งหมด
              </p>
            </div>
          </div>
        </div>

        {/* Stats - เพิ่ม responsive สำหรับ mobile */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          {/* ทั้งหมด */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 p-3 sm:p-4 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">
                  ทั้งหมด
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {approvals.length}
                </p>
              </div>

              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
              </div>
            </div>
          </div>

          {/* อนุมัติแล้ว */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg border border-green-200 p-3 sm:p-4 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-green-700 mb-1">
                  อนุมัติแล้ว
                </p>
                <p className="text-xl sm:text-2xl font-bold text-green-700">
                  {
                    approvals.filter((a) => a.approval_status === "approved")
                      .length
                  }
                </p>
              </div>

              <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* ไม่ผ่านอนุมัติ */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl shadow-lg border border-red-200 p-3 sm:p-4 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-red-700 mb-1">
                  ไม่ผ่านอนุมัติ
                </p>
                <p className="text-xl sm:text-2xl font-bold text-red-700">
                  {
                    approvals.filter((a) => a.approval_status === "rejected")
                      .length
                  }
                </p>
              </div>

              <div className="p-2 sm:p-3 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Search Bar */}
            <div className="md:col-span-2 lg:col-span-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อเอกสารหรือผู้ส่งเอกสาร..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="md:col-span-1 lg:col-span-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="rejected">ไม่ผ่านอนุมัติ</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="completed">เสร็จสิ้น</option>
              </select>
            </div>

            {/* Sort Options */}
            <div className="md:col-span-1 lg:col-span-1">
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
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

        {/* Approvals List */}
        {filteredApprovals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium mb-2">
              {searchTerm || filterStatus !== "all"
                ? "ไม่พบประวัติที่ตรงกับเงื่อนไข"
                : "ยังไม่มีประวัติการอนุมัติ"}
            </p>
            <p className="text-gray-400">
              {searchTerm || filterStatus !== "all"
                ? "ลองปรับเงื่อนไขการค้นหา"
                : "เริ่มอนุมัติเอกสารเพื่อดูประวัติ"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {currentApprovals.map((approval) => (
                <div
                  key={approval.approval_id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedApproval(approval);
                    setShowModal(true);
                    fetchDocumentFiles(approval.document_id);
                  }}
                >
                  {/* Desktop Layout */}
                  <div className="hidden sm:flex items-start justify-between gap-4">
                    <div className="flex-grow min-w-0">
                      <div
                        className={`flex items-start gap-3 ${
                          approval.description?.trim() ? "mb-3" : "mb-1"
                        }`}
                      >
                        <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />

                        <div className="flex-grow min-w-0">
                          <h3
                            className={`text-lg font-semibold text-gray-900 break-words mb-1 ${
                              approval.description?.trim() ? "mb-1" : "mb-0"
                            }`}
                          >
                            {approval.title}
                          </h3>

                          {approval.description?.trim() && (
                            <p className="text-sm text-gray-600 break-words mb-2">
                              รายละเอียด : {approval.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 ml-6">
                        <span className="flex items-center gap-1">
                          💼 ผู้ส่งเอกสาร : {approval.creator_name}
                        </span>

                        {approval.engineer_name && (
                          <span className="flex items-center gap-1">
                            🔧 มอบหมายงาน : {approval.engineer_name}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {approval.approval_status === "approved"
                            ? "วันที่อนุมัติ "
                            : "วันที่ไม่ผ่านอนุมัติ"}
                          :{" "}
                          {(() => {
                            const dateStr =
                              approval.approved_at || approval.rejected_at;
                            if (!dateStr) return "N/A";
                            return new Date(dateStr).toLocaleDateString(
                              "th-TH",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            );
                          })()}
                        </span>
                      </div>

                      {approval.comment && (
                        <div className="mt-3 ml-6 flex items-start gap-2 text-sm text-gray-600 border-l-4 border-blue-100 pl-3">
                          <span className="mt-0.5">💬</span>
                          <p className="break-words">
                            <span className="font-medium text-gray-700">
                              ความคิดเห็น :
                            </span>{" "}
                            {approval.comment}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(approval.approval_status)}
                        {approval.approval_status === "approved" &&
                          approval.document_status &&
                          getDocumentStatusBadge(approval.document_status)}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedApproval(approval);
                          setShowModal(true);
                          fetchDocumentFiles(approval.document_id);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        ดูรายละเอียด
                      </button>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="sm:hidden space-y-3">
                    <div className="flex items-start gap-2">
                      <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-grow min-w-0">
                        <h3
                          className={`text-lg font-semibold text-gray-900 break-words ${
                            approval.description?.trim() ? "mb-1" : "mb-0"
                          }`}
                        >
                          {approval.title}
                        </h3>

                        {approval.description?.trim() && (
                          <p className="text-sm text-gray-600 break-words mb-2">
                            รายละเอียด : {approval.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {getStatusBadge(approval.approval_status)}
                        {approval.approval_status === "approved" &&
                          approval.document_status &&
                          getDocumentStatusBadge(approval.document_status)}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedApproval(approval);
                          setShowModal(true);
                          fetchDocumentFiles(approval.document_id);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                      >
                        <Eye className="w-4 h-4" />
                        ดูรายละเอียด
                      </button>
                    </div>

                    <div className="space-y-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <span>💼</span>
                        <span className="truncate">
                          ผู้ส่งเอกสาร : {approval.creator_name}
                        </span>
                      </div>
                      {approval.engineer_name && (
                        <div className="flex items-center gap-1">
                          <span>🔧</span>
                          <span className="truncate">
                            มอบหมายงาน : {approval.engineer_name}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-1">
                        <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="break-words">
                          {approval.approval_status === "approved"
                            ? "วันที่อนุมัติ"
                            : "วันที่ไม่ผ่านอนุมัติ"}
                          :{" "}
                          {(() => {
                            const dateStr =
                              approval.approved_at || approval.rejected_at;
                            if (!dateStr) return "N/A";
                            return new Date(dateStr).toLocaleDateString(
                              "th-TH",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            );
                          })()}
                        </span>
                      </div>
                    </div>

                    {approval.comment && (
                      <div className="mt-3 ml-6 flex items-start gap-2 text-sm text-gray-600 border-l-4 border-blue-100 pl-3">
                        <span className="mt-0.5">💬</span>
                        <p className="break-words">
                          <span className="font-medium text-gray-700">
                            ความคิดเห็น :
                          </span>{" "}
                          {approval.comment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination - ปรับให้ responsive */}
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
                    {Math.min(endIndex, filteredApprovals.length)} จาก{" "}
                    {filteredApprovals.length} รายการ
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

        {/* Approval Detail Modal */}
        {showModal && selectedApproval && (
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
                      setShowModal(false);
                      setSelectedApproval(null);
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
                      {selectedApproval.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {getStatusBadge(selectedApproval.approval_status)}
                      {selectedApproval.approval_status === "approved" &&
                        selectedApproval.document_status &&
                        getDocumentStatusBadge(
                          selectedApproval.document_status
                        )}
                    </div>
                  </div>

                  {selectedApproval.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        คำอธิบาย
                      </p>
                      <p className="text-sm sm:text-base text-gray-700 break-words">
                        {selectedApproval.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 mb-1">
                        {selectedApproval.approval_status === "approved"
                          ? "วันที่อนุมัติ"
                          : "วันที่ไม่ผ่านอนุมัติ"}
                      </p>
                      <p className="font-medium break-words">
                        {(() => {
                          const dateStr =
                            selectedApproval.approved_at ||
                            selectedApproval.rejected_at;
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
                      <p className="text-gray-500 mb-1">ผู้ส่งเอกสาร</p>
                      <p className="font-medium break-words">
                        {selectedApproval.creator_name}
                      </p>
                    </div>

                    {selectedApproval.engineer_name && (
                      <div>
                        <p className="text-gray-500 mb-1">มอบหมายงาน</p>
                        <p className="font-medium break-words">
                          {selectedApproval.engineer_name}
                        </p>
                      </div>
                    )}
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
                          onClick={() =>
                            handleDownloadZip(selectedApproval.document_id)
                          }
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
                <ActivityTimeline documentId={selectedApproval.document_id} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
