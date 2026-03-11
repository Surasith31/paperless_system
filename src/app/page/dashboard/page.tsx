"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { FileText, Clock, CheckCircle, History, FilePlus } from "lucide-react";
import Link from "next/link";
import { userGetResponse } from "@/models/user";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Loading from "@/components/Loading";

interface DashboardStats {
  totalDocuments: number;
  pendingApprovals: number;
  approvedDocuments: number;
  assignedTasks: number;
  completedTasks: number; // เพิ่มสำหรับงานที่ Engineer ทำเสร็จ
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<userGetResponse | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalDocuments: 0,
    pendingApprovals: 0,
    approvedDocuments: 0,
    assignedTasks: 0,
    completedTasks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const response = await fetch("/api/auth/profile", {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok) {
          if (response.status === 401) {
            router.push("/page/login");
            return;
          }
          throw new Error("Failed to fetch user profile");
        }

        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          await fetchStats();
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.error("💥 Error fetching user profile:", err);
        setError("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้");
        router.push("/page/login");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUserProfile();
  }, [router]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        } else {
          console.warn("⚠️ Response not successful or missing stats:", data);
        }
      } else {
        const errorData = await response.json();
        console.error("❌ API error:", errorData);
      }
    } catch (err) {
      console.error("💥 Error fetching stats:", err);
    }
  };

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="text-red-600 text-lg font-medium">{error}</div>
          <button
            onClick={() => router.push("/page/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            กลับสู่หน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <p className="text-gray-600">ไม่พบข้อมูลผู้ใช้</p>
          <button
            onClick={() => router.push("/page/login")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            เข้าสู่ระบบใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ยินดีต้อนรับ, {user.name}
          </h1>
          <p className="text-gray-600">
            {user.roleText === "Sell" && "จัดการและส่งเอกสารของคุณ"}
            {user.roleText === "Manager" && "ตรวจสอบและอนุมัติเอกสาร"}
            {user.roleText === "Engineer" && "ดูงานที่ได้รับมอบหมาย"}
          </p>
        </div>

        {/* Dashboard Cards based on Role */}
        {user.role === 1 && (
          // Sell Dashboard
          <>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-600">
                    เอกสารทั้งหมด
                  </h3>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {stats.totalDocuments}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-600">รออนุมัติ</h3>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-orange-500 mt-2">
                  {stats.pendingApprovals}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-600">
                    อนุมัติแล้ว (จาก Manager)
                  </h3>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.approvedDocuments}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-600">
                    เสร็จสิ้น (จาก Engineer)
                  </h3>
                  <CheckCircle className="h-8 w-8 text-cyan-600" />
                </div>
                <p className="text-3xl font-bold text-cyan-600 mt-2">
                  {stats.completedTasks}
                </p>
              </div>
            </div>

            {/* Charts Section for Sell */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Bar Chart - Document Status Overview */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  สถานะเอกสาร
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={[
                      { name: "ทั้งหมด", count: stats.totalDocuments },
                      { name: "รออนุมัติ", count: stats.pendingApprovals },
                      { name: "อนุมัติแล้ว", count: stats.approvedDocuments },
                      { name: "เสร็จสิ้น", count: stats.completedTasks },
                    ]}
                  >
                    <defs>
                      <linearGradient
                        id="blueGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#60A5FA"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#2563EB"
                          stopOpacity={0.9}
                        />
                      </linearGradient>
                      <linearGradient
                        id="orangeGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#FBBF24"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#D97706"
                          stopOpacity={0.9}
                        />
                      </linearGradient>
                      <linearGradient
                        id="greenGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#34D399"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#059669"
                          stopOpacity={0.9}
                        />
                      </linearGradient>
                      <linearGradient
                        id="cyanGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#22D3EE"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#0891B2"
                          stopOpacity={0.9}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "2px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        padding: "8px 12px",
                      }}
                      labelStyle={{
                        color: "#1F2937",
                        fontWeight: "600",
                        marginBottom: "4px",
                      }}
                      itemStyle={{
                        color: "#4B5563",
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      <Cell fill="url(#blueGradient)" />
                      <Cell fill="url(#orangeGradient)" />
                      <Cell fill="url(#greenGradient)" />
                      <Cell fill="url(#cyanGradient)" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart - Document Distribution */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  สัดส่วนเอกสาร
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={
                        stats.totalDocuments === 0
                          ? [
                              {
                                name: "ยังไม่มีข้อมูล",
                                count: 1,
                                color: "#E5E7EB",
                              },
                            ]
                          : [
                              {
                                name: "รออนุมัติ",
                                count: stats.pendingApprovals,
                                color: "#F59E0B", // Orange
                              },
                              {
                                name: "อนุมัติแล้ว",
                                count: stats.approvedDocuments,
                                color: "#10B981", // Green
                              },
                              {
                                name: "เสร็จสิ้น",
                                count: stats.completedTasks,
                                color: "#06B6D4", // Cyan
                              },
                              {
                                name: "อื่นๆ",
                                count: Math.max(
                                  0,
                                  stats.totalDocuments -
                                    stats.pendingApprovals -
                                    stats.approvedDocuments -
                                    stats.completedTasks
                                ),
                                color: "#3B82F6", // Blue
                              },
                            ].filter((item) => item.count > 0)
                      }
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        percent ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                      }
                      outerRadius={80}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="count"
                      paddingAngle={2}
                    >
                      {(stats.totalDocuments === 0
                        ? [
                            {
                              name: "ยังไม่มีข้อมูล",
                              count: 1,
                              color: "#E5E7EB",
                            },
                          ]
                        : [
                            {
                              name: "รออนุมัติ",
                              count: stats.pendingApprovals,
                              color: "#F59E0B",
                            },
                            {
                              name: "อนุมัติแล้ว",
                              count: stats.approvedDocuments,
                              color: "#10B981",
                            },
                            {
                              name: "เสร็จสิ้น",
                              count: stats.completedTasks,
                              color: "#06B6D4",
                            },
                            {
                              name: "อื่นๆ",
                              count: Math.max(
                                0,
                                stats.totalDocuments -
                                  stats.pendingApprovals -
                                  stats.approvedDocuments -
                                  stats.completedTasks
                              ),
                              color: "#3B82F6",
                            },
                          ].filter((item) => item.count > 0)
                      ).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "2px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        padding: "8px 12px",
                      }}
                      labelStyle={{
                        color: "#1F2937",
                        fontWeight: "600",
                        marginBottom: "4px",
                      }}
                      itemStyle={{
                        color: "#4B5563",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions for Sell */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                การดำเนินการด่วน
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/page/sell"
                  prefetch={true}
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group cursor-pointer"
                >
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <FilePlus className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      ส่งเอกสารใหม่
                    </h3>
                    <p className="text-sm text-gray-600">
                      อัพโหลดและส่งเอกสารเพื่อขออนุมัติ
                    </p>
                  </div>
                </Link>

                <Link
                  href="/page/sell/my-documents"
                  prefetch={true}
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group cursor-pointer"
                >
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      เอกสารของฉัน
                    </h3>
                    <p className="text-sm text-gray-600">
                      ดูเอกสารที่ส่งทั้งหมดของคุณ
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </>
        )}

        {user.role === 2 && (
          // Manager Dashboard
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-600">
                    เอกสารทั้งหมด
                  </h3>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {stats.totalDocuments}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-600">รออนุมัติ</h3>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-orange-500 mt-2">
                  {stats.pendingApprovals}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-600">
                    อนุมัติแล้ว (ส่งให้ Engineer)
                  </h3>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.approvedDocuments}
                </p>
              </div>
            </div>

            {/* Charts Section for Manager */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Bar Chart - Approval Status */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  สถานะการอนุมัติ
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={[
                      { name: "ทั้งหมด", count: stats.totalDocuments },
                      { name: "รออนุมัติ", count: stats.pendingApprovals },
                      { name: "อนุมัติแล้ว", count: stats.approvedDocuments },
                    ]}
                  >
                    <defs>
                      <linearGradient
                        id="blueGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#60A5FA"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#2563EB"
                          stopOpacity={0.9}
                        />
                      </linearGradient>
                      <linearGradient
                        id="orangeGradientMgr"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#FBBF24"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#D97706"
                          stopOpacity={0.9}
                        />
                      </linearGradient>
                      <linearGradient
                        id="greenGradientMgr"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#34D399"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#059669"
                          stopOpacity={0.9}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "2px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        padding: "8px 12px",
                      }}
                      labelStyle={{
                        color: "#1F2937",
                        fontWeight: "600",
                        marginBottom: "4px",
                      }}
                      itemStyle={{
                        color: "#4B5563",
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      <Cell fill="url(#blueGradient)" />
                      <Cell fill="url(#orangeGradientMgr)" />
                      <Cell fill="url(#greenGradientMgr)" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart - Work Distribution */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  การกระจายงาน
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={
                        stats.totalDocuments === 0
                          ? [
                              {
                                name: "ยังไม่มีข้อมูล",
                                count: 1,
                                color: "#E5E7EB",
                              },
                            ]
                          : [
                              {
                                name: "รออนุมัติ",
                                count: stats.pendingApprovals,
                                color: "#F59E0B", // Orange
                              },
                              {
                                name: "อนุมัติแล้ว",
                                count: stats.approvedDocuments,
                                color: "#10B981", // Green
                              },
                              {
                                name: "อื่นๆ",
                                count: Math.max(
                                  0,
                                  stats.totalDocuments -
                                    stats.pendingApprovals -
                                    stats.approvedDocuments
                                ),
                                color: "#8B5CF6", // Purple
                              },
                            ].filter((item) => item.count > 0)
                      }
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        percent ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                      }
                      outerRadius={80}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="count"
                      paddingAngle={2}
                    >
                      {(stats.totalDocuments === 0
                        ? [
                            {
                              name: "ยังไม่มีข้อมูล",
                              count: 1,
                              color: "#E5E7EB",
                            },
                          ]
                        : [
                            {
                              name: "รออนุมัติ",
                              count: stats.pendingApprovals,
                              color: "#F59E0B",
                            },
                            {
                              name: "อนุมัติแล้ว",
                              count: stats.approvedDocuments,
                              color: "#10B981",
                            },
                            {
                              name: "อื่นๆ",
                              count: Math.max(
                                0,
                                stats.totalDocuments -
                                  stats.pendingApprovals -
                                  stats.approvedDocuments
                              ),
                              color: "#8B5CF6",
                            },
                          ].filter((item) => item.count > 0)
                      ).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "2px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        padding: "8px 12px",
                      }}
                      labelStyle={{
                        color: "#1F2937",
                        fontWeight: "600",
                        marginBottom: "4px",
                      }}
                      itemStyle={{
                        color: "#4B5563",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions for Manager */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                การดำเนินการด่วน
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/page/manager"
                  prefetch={true}
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group cursor-pointer"
                >
                  <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      เอกสารรออนุมัติ
                    </h3>
                    <p className="text-sm text-gray-600">
                      มี {stats.pendingApprovals} เอกสารรอการอนุมัติ
                    </p>
                  </div>
                </Link>

                <Link
                  href="/page/manager/approval-history"
                  prefetch={true}
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group cursor-pointer"
                >
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <History className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      ประวัติการอนุมัติ
                    </h3>
                    <p className="text-sm text-gray-600">
                      ดูเอกสารที่อนุมัติและปฏิเสธแล้ว
                    </p>
                  </div>
                </Link>
              </div>
            </div>
          </>
        )}

        {user.role === 3 && (
          // Engineer Dashboard
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-6 rounded-xl shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-600">
                    งานทั้งหมด
                  </h3>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {stats.assignedTasks}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-600">
                    กำลังดำเนินการ
                  </h3>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
                <p className="text-3xl font-bold text-orange-500 mt-2">
                  {stats.pendingApprovals}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-600">เสร็จสิ้น</h3>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.approvedDocuments}
                </p>
              </div>
            </div>

            {/* Charts Section for Engineer */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Bar Chart - Task Status */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  สถานะงาน
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={[
                      { name: "งานทั้งหมด", count: stats.assignedTasks },
                      {
                        name: "กำลังทำ",
                        count: stats.pendingApprovals,
                      },
                      { name: "เสร็จสิ้น", count: stats.approvedDocuments },
                    ]}
                  >
                    <defs>
                      <linearGradient
                        id="cyanGradientEng"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#22D3EE"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#0891B2"
                          stopOpacity={0.9}
                        />
                      </linearGradient>
                      <linearGradient
                        id="orangeGradientEng"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#FBBF24"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#D97706"
                          stopOpacity={0.9}
                        />
                      </linearGradient>
                      <linearGradient
                        id="greenGradientEng"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#34D399"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor="#059669"
                          stopOpacity={0.9}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "2px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        padding: "8px 12px",
                      }}
                      labelStyle={{
                        color: "#1F2937",
                        fontWeight: "600",
                        marginBottom: "4px",
                      }}
                      itemStyle={{
                        color: "#4B5563",
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      <Cell fill="url(#cyanGradientEng)" />
                      <Cell fill="url(#orangeGradientEng)" />
                      <Cell fill="url(#greenGradientEng)" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart - Task Completion */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  ความคืบหน้า
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={
                        stats.assignedTasks === 0
                          ? [
                              {
                                name: "ยังไม่มีงาน",
                                count: 1,
                                color: "#E5E7EB",
                              },
                            ]
                          : [
                              {
                                name: "กำลังทำ",
                                count: stats.pendingApprovals,
                                color: "#F59E0B", // Orange
                              },
                              {
                                name: "เสร็จสิ้น",
                                count: stats.approvedDocuments,
                                color: "#10B981", // Green
                              },
                              {
                                name: "รอเริ่มงาน",
                                count: Math.max(
                                  0,
                                  stats.assignedTasks -
                                    stats.pendingApprovals -
                                    stats.approvedDocuments
                                ),
                                color: "#06B6D4", // Cyan
                              },
                            ].filter((item) => item.count > 0)
                      }
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        percent ? `${name}: ${(percent * 100).toFixed(0)}%` : ""
                      }
                      outerRadius={80}
                      innerRadius={50}
                      fill="#8884d8"
                      dataKey="count"
                      paddingAngle={2}
                    >
                      {(stats.assignedTasks === 0
                        ? [{ name: "ยังไม่มีงาน", count: 1, color: "#E5E7EB" }]
                        : [
                            {
                              name: "กำลังทำ",
                              count: stats.pendingApprovals,
                              color: "#F59E0B",
                            },
                            {
                              name: "เสร็จสิ้น",
                              count: stats.approvedDocuments,
                              color: "#10B981",
                            },
                            {
                              name: "รอเริ่มงาน",
                              count: Math.max(
                                0,
                                stats.assignedTasks -
                                  stats.pendingApprovals -
                                  stats.approvedDocuments
                              ),
                              color: "#06B6D4",
                            },
                          ].filter((item) => item.count > 0)
                      ).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "2px solid #E5E7EB",
                        borderRadius: "8px",
                        boxShadow:
                          "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                        padding: "8px 12px",
                      }}
                      labelStyle={{
                        color: "#1F2937",
                        fontWeight: "600",
                        marginBottom: "4px",
                      }}
                      itemStyle={{
                        color: "#4B5563",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions for Engineer */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                การดำเนินการด่วน
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/page/engineer"
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
                >
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      งานที่ได้รับมอบหมาย
                    </h3>
                    <p className="text-sm text-gray-600">
                      มี {stats.assignedTasks} งานทั้งหมด
                    </p>
                  </div>
                </Link>

                <Link
                  href="/page/engineer"
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all cursor-pointer group"
                >
                  <div className="p-3 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      กำลังดำเนินการ
                    </h3>
                    <p className="text-sm text-gray-600">
                      มี {stats.pendingApprovals} งานที่กำลังทำ
                    </p>
                  </div>
                </Link>
              </div>

              {/* Progress Summary */}
              {stats.assignedTasks > 0 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      ความคืบหน้าโดยรวม
                    </span>
                    <span className="text-sm font-bold text-blue-600">
                      {stats.assignedTasks > 0
                        ? Math.round(
                            (stats.approvedDocuments / stats.assignedTasks) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          stats.assignedTasks > 0
                            ? (stats.approvedDocuments / stats.assignedTasks) *
                              100
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-600">
                    <span>เสร็จแล้ว: {stats.approvedDocuments} งาน</span>
                    <span>
                      เหลือ: {stats.assignedTasks - stats.approvedDocuments} งาน
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
