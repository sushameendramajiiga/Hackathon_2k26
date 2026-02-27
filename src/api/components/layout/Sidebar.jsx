import { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, BookOpen, Brain, BarChart2, Users,
  MessageCircle, Timer, LogOut, ChevronLeft, ChevronRight,
  Flame, Trophy, GraduationCap
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { label: "My Subjects", icon: BookOpen, page: "Subjects" },
  { label: "Study Plans", icon: Brain, page: "StudyPlans" },
  { label: "Progress", icon: BarChart2, page: "Progress" },
  { label: "Study Rooms", icon: Users, page: "StudyRooms" },
  { label: "AI Assistant", icon: MessageCircle, page: "AIAssistant" },
  { label: "Pomodoro", icon: Timer, page: "Pomodoro" },
];

export default function Sidebar({ currentPage, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="relative flex flex-col h-full transition-all duration-300 ease-in-out"
      style={{
        width: collapsed ? "72px" : "240px",
        background: "linear-gradient(180deg, #1A1A2E 0%, #0F0F1A 100%)",
        borderRight: "1px solid rgba(108,99,255,0.15)",
        minHeight: "100vh"
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-5 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #6C63FF, #FF6584)" }}>
          <GraduationCap size={20} color="white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-bold text-sm leading-tight" style={{ color: "#F0F0FF" }}>RGM Study</div>
            <div className="text-xs" style={{ color: "#6C63FF" }}>System</div>
          </div>
        )}
      </div>

      {/* User Info */}
      {!collapsed && user && (
        <div className="mx-3 mb-4 p-3 rounded-xl" style={{ background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.2)" }}>
          <div className="text-xs font-semibold truncate" style={{ color: "#F0F0FF" }}>{user.full_name}</div>
          <div className="text-xs mt-0.5 truncate" style={{ color: "#A0A0C0" }}>{user.email || user.phone}</div>
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-2 space-y-1">
        {NAV_ITEMS.map(({ label, icon: Icon, page }) => {
          const isActive = currentPage === page;
          return (
            <Link
              key={page}
              to={createPageUrl(page)}
              className={`sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer no-underline ${isActive ? "active" : ""}`}
              style={{ color: isActive ? "#6C63FF" : "#A0A0C0" }}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 space-y-1">
        <button
          onClick={onLogout}
          className="sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
          style={{ color: "#FF6584" }}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center z-10"
        style={{ background: "#6C63FF", border: "2px solid #0F0F1A" }}
      >
        {collapsed ? <ChevronRight size={12} color="white" /> : <ChevronLeft size={12} color="white" />}
      </button>
    </div>
  );
}
