import { BookOpen, Edit2, Trash2, Play, BarChart2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const levelColor = {
  weak: "#FF6584", moderate: "#FFB347", advanced: "#6DFFB3", not_assessed: "#A0A0C0"
};
const levelLabel = {
  weak: "Weak Learner", moderate: "Moderate Learner", advanced: "Advanced Learner", not_assessed: "Not Assessed"
};

const SUBJECT_COLORS = [
  "linear-gradient(135deg, #6C63FF, #9D8FFF)",
  "linear-gradient(135deg, #FF6584, #FF9EBC)",
  "linear-gradient(135deg, #43C6AC, #6DFFB3)",
  "linear-gradient(135deg, #F7971E, #FFD200)",
  "linear-gradient(135deg, #4facfe, #00f2fe)",
  "linear-gradient(135deg, #f093fb, #f5576c)",
];

export default function SubjectCard({ subject, index, onEdit, onDelete }) {
  const grad = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
  const lColor = levelColor[subject.learner_level] || "#A0A0C0";

  return (
    <div className="glass rounded-2xl overflow-hidden transition-all hover:scale-[1.02] hover:glow group"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Color Header */}
      <div className="h-2" style={{ background: grad }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${grad.replace("linear-gradient(135deg, ", "").split(",")[0]}20` }}>
              <BookOpen size={18} style={{ color: grad.replace("linear-gradient(135deg, ", "").split(",")[0] }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: "#F0F0FF" }}>{subject.name}</h3>
              {subject.description && (
                <p className="text-xs mt-0.5 truncate max-w-[150px]" style={{ color: "#A0A0C0" }}>
                  {subject.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(subject)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "rgba(108,99,255,0.2)" }}>
              <Edit2 size={12} style={{ color: "#6C63FF" }} />
            </button>
            <button onClick={() => onDelete(subject)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: "rgba(255,101,132,0.2)" }}>
              <Trash2 size={12} style={{ color: "#FF6584" }} />
            </button>
          </div>
        </div>

        {/* Level Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: `${lColor}18`, color: lColor, border: `1px solid ${lColor}30` }}>
            {levelLabel[subject.learner_level]}
          </span>
        </div>

        {/* Score Bar */}
        {subject.diagnostic_score != null && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "#A0A0C0" }}>
              <span>Diagnostic</span>
              <span style={{ color: lColor }}>{Math.round(subject.diagnostic_score)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${subject.diagnostic_score}%`, background: lColor }} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {subject.learner_level === "not_assessed" ? (
            <Link to={createPageUrl(`Assessment?subject_id=${subject.id}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium no-underline"
              style={{ background: "rgba(108,99,255,0.2)", color: "#6C63FF", border: "1px solid rgba(108,99,255,0.3)" }}>
              <Play size={12} /> Take Assessment
            </Link>
          ) : (
            <Link to={createPageUrl(`StudyPlans?subject_id=${subject.id}`)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium no-underline"
              style={{ background: "rgba(108,99,255,0.2)", color: "#6C63FF", border: "1px solid rgba(108,99,255,0.3)" }}>
              <BookOpen size={12} /> Study Plan
            </Link>
          )}
          <Link to={createPageUrl(`Progress?subject_id=${subject.id}`)}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium no-underline"
            style={{ background: "rgba(109,255,179,0.1)", color: "#6DFFB3", border: "1px solid rgba(109,255,179,0.2)" }}>
            <BarChart2 size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
