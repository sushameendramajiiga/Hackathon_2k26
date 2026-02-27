import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Loader2, BookOpen, Check, Flame, Clock, Zap, ArrowRight } from "lucide-react";

const levelColor = { weak: "#FF6584", moderate: "#FFB347", advanced: "#6DFFB3" };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function StudyPlans() {
  const [subjects, setSubjects] = useState([]);
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("subject_id");
    const gen = params.get("generate");
    loadData(sid, gen === "true");
  }, []);

  const loadData = async (selectedId, autoGen) => {
    try {
      const [subs, existingPlans] = await Promise.all([
        base44.entities.Subject.list("-created_date", 50),
        base44.entities.StudyPlan.list("-created_date", 50)
      ]);
      const assessed = subs.filter(s => s.learner_level !== "not_assessed");
      setSubjects(assessed);
      const planMap = {};
      existingPlans.forEach(p => { planMap[p.subject_id] = p; });
      setPlans(planMap);

      if (selectedId) {
        const sub = assessed.find(s => s.id === selectedId);
        if (sub) {
          setSelectedSubject(sub);
          if (autoGen && !planMap[selectedId]) {
            await generatePlan(sub, planMap);
          }
        }
      } else if (assessed.length > 0) {
        setSelectedSubject(assessed[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generatePlan = async (subject, currentPlans = plans) => {
    if (currentPlans[subject.id]) return;
    setGenerating(subject.id);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a detailed weekly study plan for a ${subject.learner_level} learner studying "${subject.name}".
      Return a JSON object with:
      - daily_hours: number of hours to study per day
      - break_interval_minutes: pomodoro break interval
      - motivational_message: encouraging message
      - study_tips: array of 4 practical study tips
      - weekly_schedule: array of 7 days with {day, topics: [list of topics], hours}
      Tailor the difficulty and depth to the learner level.`,
      response_json_schema: {
        type: "object",
        properties: {
          daily_hours: { type: "number" },
          break_interval_minutes: { type: "number" },
          motivational_message: { type: "string" },
          study_tips: { type: "array", items: { type: "string" } },
          weekly_schedule: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "string" },
                topics: { type: "array", items: { type: "string" } },
                hours: { type: "number" }
              }
            }
          }
        }
      }
    });

    const plan = await base44.entities.StudyPlan.create({
      subject_id: subject.id,
      subject_name: subject.name,
      learner_level: subject.learner_level,
      daily_hours: res.daily_hours || 2,
      break_interval_minutes: res.break_interval_minutes || 25,
      motivational_message: res.motivational_message || "Keep going!",
      study_tips: res.study_tips || [],
      weekly_schedule: (res.weekly_schedule || []).map(d => ({ ...d, completed: false })),
      streak_days: 0
    });

    setPlans(prev => ({ ...prev, [subject.id]: plan }));
    setGenerating(null);
  };

  const toggleDayComplete = async (planId, dayIndex, current) => {
    const plan = Object.values(plans).find(p => p.id === planId);
    if (!plan) return;
    const newSchedule = plan.weekly_schedule.map((d, i) =>
      i === dayIndex ? { ...d, completed: !d.completed } : d
    );
    const updated = await base44.entities.StudyPlan.update(planId, { weekly_schedule: newSchedule });
    setPlans(prev => ({ ...prev, [plan.subject_id]: updated }));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 size={24} className="animate-spin" style={{ color: "#6C63FF" }} />
    </div>
  );

  const currentPlan = selectedSubject ? plans[selectedSubject.id] : null;
  const lColor = selectedSubject ? levelColor[selectedSubject.learner_level] || "#6C63FF" : "#6C63FF";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#F0F0FF" }}>Study Plans</h1>
        <p className="text-sm mt-1" style={{ color: "#A0A0C0" }}>Personalized plans based on your diagnostic results</p>
      </div>

      {subjects.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <BookOpen size={48} className="mx-auto mb-4" style={{ color: "#6C63FF", opacity: 0.3 }} />
          <div className="font-semibold mb-2" style={{ color: "#F0F0FF" }}>No assessed subjects yet</div>
          <div className="text-sm mb-4" style={{ color: "#A0A0C0" }}>Complete a diagnostic assessment first</div>
          <Link to={createPageUrl("Subjects")} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm no-underline"
            style={{ background: "#6C63FF", color: "white" }}>
            Go to Subjects <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Subject Sidebar */}
          <div className="w-56 flex-shrink-0 space-y-2">
            {subjects.map(sub => (
              <button key={sub.id}
                onClick={() => { setSelectedSubject(sub); if (!plans[sub.id]) generatePlan(sub); }}
                className="w-full text-left px-4 py-3 rounded-xl transition-all text-sm"
                style={{
                  background: selectedSubject?.id === sub.id ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.04)",
                  border: selectedSubject?.id === sub.id ? "1px solid rgba(108,99,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
                  color: selectedSubject?.id === sub.id ? "#C8C5FF" : "#A0A0C0"
                }}>
                <div className="font-medium truncate">{sub.name}</div>
                <div className="text-xs mt-0.5" style={{ color: levelColor[sub.learner_level] || "#A0A0C0" }}>
                  {sub.learner_level === "not_assessed" ? "Not Assessed" : sub.learner_level.charAt(0).toUpperCase() + sub.learner_level.slice(1)}
                </div>
              </button>
            ))}
          </div>

          {/* Plan Content */}
          <div className="flex-1">
            {generating === selectedSubject?.id ? (
              <div className="glass rounded-2xl p-16 text-center">
                <Loader2 size={32} className="animate-spin mx-auto mb-4" style={{ color: "#6C63FF" }} />
                <div className="font-medium" style={{ color: "#F0F0FF" }}>Generating your personalized plan...</div>
              </div>
            ) : !currentPlan ? (
              <div className="glass rounded-2xl p-10 text-center">
                <div className="font-medium mb-3" style={{ color: "#F0F0FF" }}>
                  No plan yet for {selectedSubject?.name}
                </div>
                <button onClick={() => generatePlan(selectedSubject)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "#6C63FF", color: "white" }}>
                  Generate Plan
                </button>
              </div>
            ) : (
              <div className="space-y-5 animate-fadeInUp">
                {/* Header Card */}
                <div className="glass rounded-2xl p-5" style={{ borderLeft: `3px solid ${lColor}` }}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h2 className="text-lg font-bold mb-1" style={{ color: "#F0F0FF" }}>
                        {selectedSubject.name} — Study Plan
                      </h2>
                      <p className="text-sm italic" style={{ color: "#A0A0C0" }}>
                        "{currentPlan.motivational_message}"
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: lColor }}>{currentPlan.daily_hours}</div>
                        <div className="text-xs" style={{ color: "#A0A0C0" }}>hrs/day</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold flex items-center gap-1" style={{ color: "#FF6584" }}>
                          <Flame size={18} />{currentPlan.streak_days}
                        </div>
                        <div className="text-xs" style={{ color: "#A0A0C0" }}>streak</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                {currentPlan.study_tips?.length > 0 && (
                  <div className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={16} style={{ color: "#FFD700" }} />
                      <h3 className="font-semibold text-sm" style={{ color: "#F0F0FF" }}>Study Tips</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {currentPlan.study_tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs" style={{ color: "#A0A0C0" }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                            style={{ background: "rgba(108,99,255,0.2)", color: "#6C63FF" }}>{i + 1}</div>
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weekly Schedule */}
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock size={16} style={{ color: "#6C63FF" }} />
                    <h3 className="font-semibold text-sm" style={{ color: "#F0F0FF" }}>Weekly Schedule</h3>
                  </div>
                  <div className="space-y-3">
                    {currentPlan.weekly_schedule?.map((day, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 rounded-xl transition-all"
                        style={{
                          background: day.completed ? "rgba(109,255,179,0.08)" : "rgba(255,255,255,0.04)",
                          border: day.completed ? "1px solid rgba(109,255,179,0.2)" : "1px solid rgba(255,255,255,0.06)"
                        }}>
                        <button onClick={() => toggleDayComplete(currentPlan.id, i, day.completed)}
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                          style={{
                            background: day.completed ? "#6DFFB3" : "rgba(255,255,255,0.08)",
                            border: day.completed ? "none" : "1px solid rgba(255,255,255,0.15)"
                          }}>
                          {day.completed && <Check size={12} color="#0F0F1A" strokeWidth={3} />}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium" style={{ color: day.completed ? "#6DFFB3" : "#F0F0FF" }}>
                              {day.day}
                            </span>
                            <span className="text-xs" style={{ color: "#A0A0C0" }}>{day.hours}h</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {day.topics?.map((topic, ti) => (
                              <span key={ti} className="text-xs px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(108,99,255,0.15)", color: "#9D8FFF" }}>
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
