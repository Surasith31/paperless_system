"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActivityWithUser } from "@/models/activity";

interface ActivityTimelineProps {
  documentId: number;
}

export default function ActivityTimeline({
  documentId,
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityWithUser[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<
    ActivityWithUser[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/documents/${documentId}/activities`);
      const data = await response.json();

      if (data.success) {
        const activitiesData = (data.activities ?? []) as ActivityWithUser[];
        setActivities(activitiesData);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      console.error("Fetch activities error:", err);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const applyFilters = useCallback(() => {
    const filtered = [...activities];
    setFilteredActivities(filtered);
  }, [activities]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      // Document lifecycle
      document_created: "📄",
      document_submitted: "📤",
      document_approved: "✅",
      document_rejected: "❌",

      // Assignment
      work_assigned: "👤",

      // Status updates
      status_update: "🔄",

      // Work progress
      work_started: "🚀",
      work_in_progress: "⚙️",
      work_completed: "🎉",

      // Others
      document_cancelled: "🚫",
      comment_added: "💬",
      document_updated: "✏️",
      document_archived: "📦",
    };
    return icons[action] || "•";
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      // Document lifecycle
      document_created: "bg-blue-100 text-blue-600",
      document_submitted: "bg-purple-100 text-purple-600",
      document_approved: "bg-green-100 text-green-600",
      document_rejected: "bg-red-100 text-red-600",

      // Assignment
      work_assigned: "bg-yellow-100 text-yellow-600",

      // Status updates
      status_update: "bg-indigo-100 text-indigo-600",

      // Work progress
      work_started: "bg-cyan-100 text-cyan-600",
      work_in_progress: "bg-orange-100 text-orange-600",
      work_completed: "bg-teal-100 text-teal-600",

      // Others
      document_cancelled: "bg-gray-100 text-gray-600",
      comment_added: "bg-pink-100 text-pink-600",
      document_updated: "bg-blue-100 text-blue-600",
      document_archived: "bg-slate-100 text-slate-600",
    };
    return colors[action] || "bg-gray-100 text-gray-600";
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "เมื่อสักครู่";
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header with Filter Button */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>📜</span>
          <span>ประวัติการทำรายการ</span>
        </h3>
      </div>

      {/* Timeline */}
      {filteredActivities.length === 0 ? (
        <div className="text-center py-8 text-gray-500"></div>
      ) : (
        <div className="space-y-4">
          {filteredActivities.map((activity, index) => (
            <div key={activity.id} className="relative">
              {/* Timeline line */}
              {index < filteredActivities.length - 1 && (
                <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-gray-200"></div>
              )}

              <div className="flex gap-4">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${getActionColor(
                    activity.action
                  )}`}
                >
                  <span className="text-xs sm:text-sm">
                    {getActionIcon(activity.action)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-grow pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-grow">
                      <p className="text-sm sm:text-base text-gray-900 font-medium">
                        {activity.description || activity.action}
                      </p>

                      {activity.user_name && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                          โดย {activity.user_name}{" "}
                          {activity.user_role && `(${activity.user_role})`}
                        </p>
                      )}

                      {/* Metadata - แสดง comment/message ถ้ามี */}
                      {activity.metadata &&
                        (() => {
                          try {
                            const metadata =
                              typeof activity.metadata === "string"
                                ? JSON.parse(activity.metadata)
                                : activity.metadata;

                            // รองรับทั้ง comment และ message
                            const commentText = metadata.comment || metadata.message;

                            if (commentText) {
                              return (
                                <div className="mt-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                                  <p className="text-xs sm:text-sm text-gray-700">
                                    💬 {commentText}
                                  </p>
                                </div>
                              );
                            }
                          } catch {
                            // Ignore JSON parse errors
                          }
                          return null;
                        })()}
                    </div>

                    <div className="text-xs sm:text-sm text-gray-400 whitespace-nowrap">
                      {formatDate(activity.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
