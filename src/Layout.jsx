import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Sidebar from "./components/layout/Sidebar";

const PUBLIC_PAGES = ["Login", "Signup"];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch {
        if (!PUBLIC_PAGES.includes(currentPageName)) {
          base44.auth.redirectToLogin();
        }
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [currentPageName]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const isPublic = PUBLIC_PAGES.includes(currentPageName);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F0F1A" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl animate-pulse-glow" style={{ background: "linear-gradient(135deg, #6C63FF, #FF6584)" }} />
          <div className="text-sm" style={{ color: "#6C63FF" }}>Loading RGM Study System...</div>
        </div>
      </div>
    );
  }

  if (isPublic) {
    return (
      <div style={{ background: "#0F0F1A", minHeight: "100vh" }}>
        {children}
      </div>
    );
  }

  return (
    <div className="flex" style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      <Sidebar currentPage={currentPageName} user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto" style={{ minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
