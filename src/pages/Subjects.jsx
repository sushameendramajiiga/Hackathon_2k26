import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Plus, Search, BookOpen } from "lucide-react";
import SubjectCard from "../components/subjects/SubjectCard";
import AddSubjectModal from "../components/subjects/AddSubjectModal";

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [editSubject, setEditSubject] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { loadSubjects(); }, []);

  const loadSubjects = async () => {
    try {
      const data = await base44.entities.Subject.list("-created_date", 50);
      setSubjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async ({ name, description }) => {
    const sub = await base44.entities.Subject.create({
      name,
      description,
      learner_level: "not_assessed"
    });
    setShowAddModal(false);
    navigate(createPageUrl(`Assessment?subject_id=${sub.id}`));
  };

  const handleDelete = async (subject) => {
    if (!confirm(`Delete "${subject.name}"? This will also remove its study plan and assessments.`)) return;
    await base44.entities.Subject.delete(subject.id);
    // Clean up related data
    const [plans, assessments] = await Promise.all([
      base44.entities.StudyPlan.filter({ subject_id: subject.id }),
      base44.entities.Assessment.filter({ subject_id: subject.id }),
    ]);
    await Promise.all([
      ...plans.map(p => base44.entities.StudyPlan.delete(p.id)),
      ...assessments.map(a => base44.entities.Assessment.delete(a.id)),
    ]);
    setSubjects(prev => prev.filter(s => s.id !== subject.id));
  };

  const handleEdit = async (subject) => {
    const newName = prompt("Edit subject name:", subject.name);
    if (!newName || newName.trim() === subject.name) return;
    const updated = await base44.entities.Subject.update(subject.id, { name: newName.trim() });
    setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, name: newName.trim() } : s));
  };

  const filtered = subjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#F0F0FF" }}>My Subjects</h1>
          <p className="text-sm mt-1" style={{ color: "#A0A0C0" }}>
            {subjects.length} subject{subjects.length !== 1 ? "s" : ""} in your curriculum
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "linear-gradient(135deg, #6C63FF, #9D8FFF)", color: "white" }}>
          <Plus size={16} /> Add Subject
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#A0A0C0" }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search subjects..."
          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F0FF" }}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <BookOpen size={48} className="mx-auto mb-4" style={{ color: "#6C63FF", opacity: 0.3 }} />
          <div className="font-semibold text-lg mb-2" style={{ color: "#F0F0FF" }}>
            {search ? "No subjects found" : "Start Your Learning Journey"}
          </div>
          <div className="text-sm mb-6" style={{ color: "#A0A0C0" }}>
            {search ? "Try a different search term" : "Add your first subject to begin"}
          </div>
          {!search && (
            <button onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "linear-gradient(135deg, #6C63FF, #9D8FFF)", color: "white" }}>
              <Plus size={14} /> Add Your First Subject
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sub, i) => (
            <SubjectCard
              key={sub.id}
              subject={sub}
              index={i}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddSubjectModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
}
