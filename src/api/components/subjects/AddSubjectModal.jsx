import { useState } from "react";
import { X, BookOpen, Loader2 } from "lucide-react";

export default function AddSubjectModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onAdd({ name: name.trim(), description: description.trim() });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 animate-fadeInUp"
        style={{ background: "#1E1E32", border: "1px solid rgba(108,99,255,0.3)" }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(108,99,255,0.2)" }}>
              <BookOpen size={18} style={{ color: "#6C63FF" }} />
            </div>
            <h2 className="text-lg font-semibold" style={{ color: "#F0F0FF" }}>Add New Subject</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)" }}>
            <X size={16} style={{ color: "#A0A0C0" }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "#A0A0C0" }}>
              Subject Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Mathematics, Physics, History..."
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0FF" }}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: "#A0A0C0" }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the subject..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0FF" }}
            />
          </div>

          <div className="rounded-xl p-3 text-xs" style={{ background: "rgba(108,99,255,0.1)", color: "#A0A0C0" }}>
            💡 After adding, you'll take a diagnostic test to identify your current level.
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-medium"
              style={{ background: "rgba(255,255,255,0.05)", color: "#A0A0C0" }}>
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || loading}
              className="flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-opacity"
              style={{ background: "linear-gradient(135deg, #6C63FF, #9D8FFF)", color: "white", opacity: !name.trim() ? 0.5 : 1 }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "Adding..." : "Add & Assess"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
