"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  User,
  LogOut,
  FileText,
  Clock,
  CheckCircle,
  FilePlus,
  History,
  Save,
} from "lucide-react";
import { userGetResponse } from "@/models/user";
import Image from "next/image";
import Alert from "./Alert";

interface NavbarProps {
  user: userGetResponse;
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  const [editForm, setEditForm] = useState({
    name: user.name,
    email: user.email,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [currentUserData, setCurrentUserData] = useState({
    name: user.name,
    email: user.email,
    roleText: user.roleText,
  });

  const handleCloseDialog = () => {
    setShowEditDialog(false);
    setEditError("");
    setEditSuccess(false);
    // Reset form to current user data
    setEditForm({
      name: currentUserData.name,
      email: currentUserData.email,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        router.push("/page/login");
        router.refresh();
      } else {
        console.error("Logout failed:", data.error);
        router.push("/page/login");
      }
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/page/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess(false);

    if (
      editForm.newPassword &&
      editForm.newPassword !== editForm.confirmPassword
    ) {
      setEditError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    if (editForm.newPassword && editForm.newPassword.length < 8) {
      setEditError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (editForm.newPassword && !editForm.currentPassword) {
      setEditError("กรุณากรอกรหัสผ่านปัจจุบัน");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          currentPassword: editForm.currentPassword || undefined,
          newPassword: editForm.newPassword || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setEditError(data.error || "เกิดข้อผิดพลาด");
        setIsSaving(false);
        return;
      }

      setEditSuccess(true);

      // Update local user data immediately
      setCurrentUserData({
        name: editForm.name,
        email: editForm.email,
        roleText: currentUserData.roleText,
      });

      // Reset password fields only
      setEditForm({
        name: editForm.name,
        email: editForm.email,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Close dialog after showing success message
      setTimeout(() => {
        setEditSuccess(false);
        setShowEditDialog(false);
        setIsSaving(false);
        // Optional: Soft reload to sync with server
        router.refresh();
      }, 2000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setEditError("เกิดข้อผิดพลาดในการบันทึก");
      setIsSaving(false);
    }
  };
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showEditDialog) {
        setShowEditDialog(false);
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [showEditDialog]);
  // Menu items based on role
  const getMenuItems = () => {
    const items = [];

    if (user.role === 1) {
      // Sell
      items.push({
        label: "ส่งเอกสารใหม่",
        href: "/page/sell",
        icon: <FilePlus size={18} />,
        roles: [1],
      });
      items.push({
        label: "เอกสารของฉัน",
        href: "/page/sell/my-documents",
        icon: <FileText size={18} />,
        roles: [1],
      });
    }

    if (user.role === 2) {
      // Manager
      items.push({
        label: "เอกสารรออนุมัติ",
        href: "/page/manager",
        icon: <Clock size={18} />,
        roles: [2],
      });
      items.push({
        label: "ประวัติการอนุมัติ",
        href: "/page/manager/approval-history",
        icon: <History size={18} />,
        roles: [2],
      });
    }

    if (user.role === 3) {
      // Engineer
      items.push({
        label: "งานที่ได้รับ",
        href: "/page/engineer",
        icon: <CheckCircle size={18} />,
        roles: [3],
      });
    }

    return items.filter((item) => item.roles.includes(user.role));
  };

  const menuItems = getMenuItems();

  return (
    <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/page/dashboard"
            prefetch={true}
            aria-label="Dashboard"
            className="flex items-center gap-3 cursor-pointer"
          >
            <Image
              src="/logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="object-contain"
            />

            <span className="text-white font-semibold text-lg">
              Paperless System
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {/* Navigation Links */}
            <div className="flex items-center gap-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/20 transition cursor-pointer"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>

            {/* User Info with Edit Button */}
            <button
              onClick={() => setShowEditDialog(true)}
              className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20 transition cursor-pointer"
            >
              <User size={18} className="text-white" />
              <div className="text-white text-sm text-left">
                <div className="font-medium">{currentUserData.name}</div>
                <div className="text-xs text-white/80">
                  {currentUserData.roleText}
                </div>
              </div>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-white hover:bg-white/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  กำลังออก...
                </>
              ) : (
                <>
                  <LogOut size={18} />
                  Logout
                </>
              )}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setOpen(!open)}
              className="text-white focus:outline-none cursor-pointer"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        ></div>
      )}
      {/* Mobile Dropdown Menu */}
      {open && (
        <div className="md:hidden absolute top-18 right-4 z-50 ">
          <div
            className="w-64 rounded-xl bg-white/70 backdrop-blur-md shadow-2xl py-4 px-4 space-y-4 animate-[slideIn_0.25s_ease-out]"
            style={{
              transformOrigin: "top right",
            }}
          >
            {/* User Info */}
            <div
              className="flex items-center gap-3 border-b pb-3 cursor-pointer"
              onClick={() => {
                setOpen(false);
                setShowEditDialog(true);
              }}
            >
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
                <User size={20} className="text-white" />
              </div>

              <div>
                <div className="font-semibold text-gray-900">
                  {currentUserData.name}
                </div>
                <div className="text-sm text-gray-600">
                  {currentUserData.roleText}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-800 hover:bg-white/60 transition backdrop-blur-md bg-gray-100 cursor-pointer"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-100/60 transition disabled:opacity-60 bg-red-100"
            >
              {isLoggingOut ? (
                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <LogOut size={18} />
              )}
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
            {editSuccess && (
              <Alert
                type="success"
                message="✅ บันทึกข้อมูลสำเร็จ"
                onClose={() => setEditSuccess(false)}
              />
            )}

            {editError && (
              <Alert
                type="error"
                message={editError}
                onClose={() => setEditError("")}
              />
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-[slideIn_0.3s_ease-out]">
            <div className="relative flex items-center justify-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">แก้ไขข้อมูล</h2>

              <button
                onClick={handleCloseDialog}
                className="absolute right-0 text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleEditProfile} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ชื่อ
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  อีเมล
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              {/* Divider */}
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  เปลี่ยนรหัสผ่าน (ถ้าต้องการ)
                </p>
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  รหัสผ่านปัจจุบัน
                </label>
                <input
                  type="password"
                  value={editForm.currentPassword}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      currentPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="กรอกถ้าต้องการเปลี่ยนรหัสผ่าน"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  รหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  value={editForm.newPassword}
                  onChange={(e) =>
                    setEditForm({ ...editForm, newPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="กรอกรหัสผ่านใหม่"
                  minLength={8}
                />
                <p className="mt-1 text-xs text-gray-500">
                  ต้องมีอย่างน้อย 8 ตัวอักษร
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <input
                  type="password"
                  value={editForm.confirmPassword}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="ยืนยันรหัสผ่านใหม่"
                  minLength={8}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      บันทึก
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
