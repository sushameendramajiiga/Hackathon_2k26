import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  BookOpen, Brain, BarChart2, Users, Flame, Trophy,
  Plus, ArrowRight, TrendingUp, CheckCircle, Clock, LogIn
} from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [studyPlans, setStudyPlans] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [me, subs, plans, quizzes] = await Promise.all([
        base44.auth.me(),
        base44.entities.Subject.list("-created_date", 20),
        base44.entities.StudyPlan.list("-created_date", 20),
        base44.entities.QuizResult.list("-created_date", 20),
      ]);
      setUser(me);
      setSubjects(subs);
      setStudyPlans(plans);
      setQuizResults(quizzes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalStreak = studyPlans.reduce((a, p) => a + (p.streak_days || 0), 0);
  const avgScore = quizResults.length
    ? Math.round(quizResults.reduce((a, q) => a + (q.score_percentage || 0), 0) / quizResults.length)
    : 0;

  const levelColor = {
    weak: "#FF6584",
    moderate: "#FFB347",
    advanced: "#6DFFB3",
    not_assessed: "#A0A0C0"
  };

  const levelLabel = {
    weak: "Weak Learner",
    moderate: "Moderate Learner",
    advanced: "Advanced Learner",
    not_assessed: "Not Assessed"
  };

  const stats = [
    { label: "Subjects", value: subjects.length, icon: BookOpen, color: "#6C63FF" },
    { label: "Study Streak", value: `${totalStreak}d`, icon: Flame, color: "#FF6584" },
    { label: "Avg Score", value: `${avgScore}%`, icon: Trophy, color: "#FFD700" },
    { label: "Quiz Taken", value: quizResults.length, icon: BarChart2, color: "#6DFFB3" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="animate-fadeInUp">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm" style={{ color: "#6C63FF" }}>
            {format(new Date(), "EEEE, MMMM d")}
          </div>
          {!user && (
            <button
              onClick={() => base44.auth.redirectToLogin()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "linear-gradient(135deg, #6C63FF, #9D8FFF)", color: "white" }}>
              <LogIn size={15} /> Login
            </button>
          )}
        </div>
        <h1 className="text-3xl font-bold" style={{ color: "#F0F0FF" }}>
          {greeting}, <span className="gradient-text">{user?.full_name?.split(" ")[0] || "Scholar"}!</span> 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "#A0A0C0" }}>
          {subjects.length === 0
            ? "Start by adding your first subject to begin your journey."
            : `You have ${subjects.length} subject${subjects.length > 1 ? "s" : ""} in your learning path.`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeInUp">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: "#A0A0C0" }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${color}20` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: "#F0F0FF" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeInUp">
        <Link to={createPageUrl("Subjects")}
          className="glass rounded-2xl p-5 flex items-center gap-4 no-underline group hover:border-purple-500 transition-all"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(108,99,255,0.2)" }}>
            <Plus size={22} style={{ color: "#6C63FF" }} />
          </div>
          <div className="flex-1">
            <div className="font-semibold" style={{ color: "#F0F0FF" }}>Add New Subject</div>
            <div className="text-xs mt-0.5" style={{ color: "#A0A0C0" }}>Take a diagnostic test</div>
          </div>
          <ArrowRight size={16} style={{ color: "#6C63FF" }} className="group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link to={createPageUrl("Pomodoro")}
          className="glass rounded-2xl p-5 flex items-center gap-4 no-underline group hover:border-pink-500 transition-all"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,101,132,0.2)" }}>
            <Clock size={22} style={{ color: "#FF6584" }} />
          </div>
          <div className="flex-1">
            <div className="font-semibold" style={{ color: "#F0F0FF" }}>Start Focus Session</div>
            <div className="text-xs mt-0.5" style={{ color: "#A0A0C0" }}>Pomodoro timer ready</div>
          </div>
          <ArrowRight size={16} style={{ color: "#FF6584" }} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Subjects Grid */}
      <div className="animate-fadeInUp">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg" style={{ color: "#F0F0FF" }}>My Subjects</h2>
          <Link to={createPageUrl("Subjects")} className="text-xs flex items-center gap-1 no-underline"
            style={{ color: "#6C63FF" }}>
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {subjects.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <BookOpen size={36} className="mx-auto mb-3" style={{ color: "#6C63FF", opacity: 0.5 }} />
            <div className="font-medium mb-1" style={{ color: "#F0F0FF" }}>No subjects yet</div>
            <div className="text-sm mb-4" style={{ color: "#A0A0C0" }}>Add your first subject to get started</div>
            <Link to={createPageUrl("Subjects")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium no-underline"
              style={{ background: "#6C63FF", color: "white" }}>
              <Plus size={14} /> Add Subject
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.slice(0, 6).map((sub) => (
              <div key={sub.id} className="glass rounded-2xl p-5 hover:glow transition-all"
                style={{ borderLeft: `3px solid ${levelColor[sub.learner_level] || "#6C63FF"}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="font-semibold truncate flex-1 mr-2" style={{ color: "#F0F0FF" }}>{sub.name}</div>
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: `${levelColor[sub.learner_level] || "#6C63FF"}20`, color: levelColor[sub.learner_level] || "#6C63FF" }}>
                    {levelLabel[sub.learner_level]}
                  </span>
                </div>
                {sub.diagnostic_score !== undefined && sub.diagnostic_score !== null && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1" style={{ color: "#A0A0C0" }}>
                      <span>Diagnostic Score</span>
                      <span>{Math.round(sub.diagnostic_score)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${sub.diagnostic_score}%`, background: levelColor[sub.learner_level] || "#6C63FF" }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Quiz Results */}
      {quizResults.length > 0 && (
        <div className="animate-fadeInUp">
          <h2 className="font-semibold text-lg mb-4" style={{ color: "#F0F0FF" }}>Recent Quiz Results</h2>
          <div className="glass rounded-2xl overflow-hidden">
            {quizResults.slice(0, 4).map((q, i) => (
              <div key={q.id} className="flex items-center gap-4 p-4"
                style={{ borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: q.score_percentage >= 70 ? "rgba(109,255,179,0.15)" : "rgba(255,101,132,0.15)" }}>
                  {q.score_percentage >= 70
                    ? <CheckCircle size={18} style={{ color: "#6DFFB3" }} />
                    : <TrendingUp size={18} style={{ color: "#FF6584" }} />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: "#F0F0FF" }}>{q.subject_name}</div>
                  <div className="text-xs" style={{ color: "#A0A0C0" }}>Week {q.week_number}</div>
                </div>
                <div className="text-lg font-bold"
                  style={{ color: q.score_percentage >= 70 ? "#6DFFB3" : "#FF6584" }}>
                  {Math.round(q.score_percentage)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
