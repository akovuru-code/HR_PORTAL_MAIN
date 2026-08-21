import React, { useState, useEffect } from "react";

export default function AnnouncementsPanel({ forcedRole }) {
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const user = stored ? JSON.parse(stored) : null;
    const role = forcedRole || user?.role || "employee";

    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`/api/announcements?role=${encodeURIComponent(role.toLowerCase())}`);
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      } catch {}
    };

    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 30000);
    return () => clearInterval(interval);
  }, [forcedRole]);

  if (announcements.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-white border border-blue-200 rounded-xl shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-4 text-blue-800 border-b border-blue-100 pb-2">
        <span className="text-2xl">📢</span>
        <h2 className="text-lg font-bold">Important Announcements</h2>
      </div>
      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
        {announcements.map(ann => (
          <div key={ann.id} className="p-4 bg-white border-l-4 border-blue-500 rounded shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs font-bold text-blue-600 tracking-wide uppercase">Notice</span>
              <span className="text-xs font-medium text-gray-400">
                {new Date(ann.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-gray-800 whitespace-pre-wrap mt-1 text-sm">{ann.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
