import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import { BarChart2, TrendingUp, Trophy, AlertCircle, Play, Loader2 } from "lucide-react";

const levelColor = { weak: "#FF6584", moderate: "#FFB347", advanced: "#6DFFB3", not_assessed: "#A0A0C0" };

export default function Progress() {
  const [subjects, setSubjects] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("subject_id");
    loadData(sid);
  }, []);

  const loadData = async (selectedId) => {
    const [subs, results] = await Promise.all([
      base44.entities.Subject.list("-created_date", 50),
      base44.entities.QuizResult.list("-created_date", 100)
    ]);
    setSubjects(subs);
    setQuizResults(results);
    const def = selectedId ? subs.find(s => s.id === selectedId) : subs[0];
    if (def) setSelectedSubject(def);
    setLoading(false);
  };

  const getSubjectResults = (subjectId) =>
    quizResults.filter(r => r.subject_id === subjectId).sort((a, b) => a.week_number - b.week_number);

  const generateWeeklyQuiz = async () => {
    if (!selectedSubject) return;
    setGeneratingQuiz(true);
    setQuizAnswers({});
    setQuizResult(null);

    const existingResults = getSubjectResults(selectedSubject.id);
    const weekNum = existingResults.length + 1;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate 10 MCQ questions for a weekly quiz on "${selectedSubject.name}" for a ${selectedSubject.learner_level} learner (Week ${weekNum}).
      Questions should be slightly more challenging than the diagnostic test.
      Return JSON with key "questions" containing array of {question, options: [4 options], correct_answer: 0-based index}.`,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "number" }
              }
            }
          }
        }
      }
    });

    setQuiz({ questions: res.questions, weekNum });
    setGeneratingQuiz(false);
    setShowQuizModal(true);
  };

  const submitQuiz = async () => {
    setSubmittingQuiz(true);
    const correct = quiz.questions.filter((q, i) => quizAnswers[i] === q.correct_answer).length;
    const pct = (correct / quiz.questions.length) * 100;
    await base44.entities.QuizResult.create({
      subject_id: selectedSubject.id,
      subject_name: selectedSubject.name,
      week_number: quiz.weekNum,
      questions: quiz.questions.map((q, i) => ({ ...q, user_answer: quizAnswers[i] ?? -1 })),
      score: correct,
      score_percentage: pct,
    });
    setQuizResult({ correct, total: quiz.questions.length, pct });
    setSubmittingQuiz(false);
    loadData(selectedSubject.id);
  };

  const chartData = selectedSubject
    ? getSubjectResults(selectedSubject.id).map(r => ({
        week: `W${r.week_number}`, score: Math.round(r.score_percentage)
      }))
    : [];

  const allSubjectsData = subjects.map(s => ({
    subject: s.name.substring(0, 8),
    score: Math.round(s.diagnostic_score || 0),
    level: s.learner_level
  }));

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="animate-spin" style={{ color: "#6C63FF" }} />
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#F0F0FF" }}>Progress Analytics</h1>
        <p className="text-sm mt-1" style={{ color: "#A0A0C0" }}>Track your learning journey over time</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-2xl p-4">
          <div className="text-xs mb-2" style={{ color: "#A0A0C0" }}>Total Subjects</div>
          <div className="text-2xl font-bold" style={{ color: "#F0F0FF" }}>{subjects.length}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs mb-2" style={{ color: "#A0A0C0" }}>Quizzes Taken</div>
          <div className="text-2xl font-bold" style={{ color: "#6C63FF" }}>{quizResults.length}</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs mb-2" style={{ color: "#A0A0C0" }}>Advanced Subjects</div>
          <div className="text-2xl font-bold" style={{ color: "#6DFFB3" }}>
            {subjects.filter(s => s.learner_level === "advanced").length}
          </div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-xs mb-2" style={{ color: "#A0A0C0" }}>Avg Quiz Score</div>
          <div className="text-2xl font-bold" style={{ color: "#FFD700" }}>
            {quizResults.length ? Math.round(quizResults.reduce((a, r) => a + r.score_percentage, 0) / quizResults.length) : 0}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject List */}
        <div className="space-y-2">
          <div className="text-xs font-medium mb-3" style={{ color: "#A0A0C0" }}>SELECT SUBJECT</div>
          {subjects.map(sub => (
            <button key={sub.id} onClick={() => setSelectedSubject(sub)}
              className="w-full text-left p-3 rounded-xl transition-all"
              style={{
                background: selectedSubject?.id === sub.id ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.04)",
                border: selectedSubject?.id === sub.id ? "1px solid rgba(108,99,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
              }}>
              <div className="text-sm font-medium truncate" style={{ color: "#F0F0FF" }}>{sub.name}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs" style={{ color: levelColor[sub.learner_level] }}>
                  {sub.learner_level}
                </span>
                <span className="text-xs" style={{ color: "#A0A0C0" }}>
                  {getSubjectResults(sub.id).length} quizzes
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="lg:col-span-2 space-y-5">
          {selectedSubject && (
            <>
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold" style={{ color: "#F0F0FF" }}>{selectedSubject.name}</h3>
                    <p className="text-xs" style={{ color: "#A0A0C0" }}>Weekly quiz performance</p>
                  </div>
                  <button onClick={generateWeeklyQuiz} disabled={generatingQuiz}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                    style={{ background: "linear-gradient(135deg, #6C63FF, #9D8FFF)", color: "white" }}>
                    {generatingQuiz ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    {generatingQuiz ? "Generating..." : "Take Weekly Quiz"}
                  </button>
                </div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="week" tick={{ fill: "#A0A0C0", fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#A0A0C0", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "#1E1E32", border: "1px solid rgba(108,99,255,0.3)", borderRadius: "12px", color: "#F0F0FF" }}
                      />
                      <Line type="monotone" dataKey="score" stroke="#6C63FF" strokeWidth={2} dot={{ fill: "#6C63FF", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: "#A0A0C0" }}>
                    No quiz results yet. Take your first weekly quiz!
                  </div>
                )}
              </div>

              {/* Diagnostic Scores Chart */}
              <div className="glass rounded-2xl p-5">
                <h3 className="font-semibold mb-4" style={{ color: "#F0F0FF" }}>All Subjects Overview</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={allSubjectsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="subject" tick={{ fill: "#A0A0C0", fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#A0A0C0", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#1E1E32", border: "1px solid rgba(108,99,255,0.3)", borderRadius: "12px", color: "#F0F0FF" }} />
                    <Bar dataKey="score" fill="#6C63FF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuizModal && quiz && !quizResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 animate-fadeInUp"
            style={{ background: "#1E1E32", border: "1px solid rgba(108,99,255,0.3)" }}>
            <h2 className="text-lg font-bold mb-2" style={{ color: "#F0F0FF" }}>
              Week {quiz.weekNum} Quiz — {selectedSubject?.name}
            </h2>
            <p className="text-sm mb-5" style={{ color: "#A0A0C0" }}>Answer all {quiz.questions.length} questions</p>
            <div className="space-y-6">
              {quiz.questions.map((q, qi) => (
                <div key={qi}>
                  <p className="text-sm font-medium mb-3" style={{ color: "#F0F0FF" }}>
                    {qi + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <button key={oi} onClick={() => setQuizAnswers(prev => ({ ...prev, [qi]: oi }))}
                        className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all"
                        style={{
                          background: quizAnswers[qi] === oi ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.04)",
                          border: quizAnswers[qi] === oi ? "1px solid rgba(108,99,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
                          color: quizAnswers[qi] === oi ? "#C8C5FF" : "#A0A0C0"
                        }}>
                        {String.fromCharCode(65 + oi)}. {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowQuizModal(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: "rgba(255,255,255,0.05)", color: "#A0A0C0" }}>Cancel</button>
              <button onClick={submitQuiz}
                disabled={Object.keys(quizAnswers).length < quiz.questions.length || submittingQuiz}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #6C63FF, #9D8FFF)",
                  color: "white",
                  opacity: Object.keys(quizAnswers).length < quiz.questions.length ? 0.5 : 1
                }}>
                {submittingQuiz ? <Loader2 size={14} className="animate-spin" /> : null}
                Submit Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Result */}
      {quizResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-8 text-center animate-fadeInUp"
            style={{ background: "#1E1E32", border: "1px solid rgba(108,99,255,0.3)" }}>
            <Trophy size={48} className="mx-auto mb-4" style={{ color: "#FFD700" }} />
            <div className="text-4xl font-bold mb-2"
              style={{ color: quizResult.pct >= 70 ? "#6DFFB3" : quizResult.pct >= 40 ? "#FFB347" : "#FF6584" }}>
              {Math.round(quizResult.pct)}%
            </div>
            <div className="text-sm mb-4" style={{ color: "#A0A0C0" }}>
              {quizResult.correct} out of {quizResult.total} correct
            </div>
            <button onClick={() => { setQuizResult(null); setShowQuizModal(false); }}
              className="w-full py-3 rounded-xl font-medium"
              style={{ background: "linear-gradient(135deg, #6C63FF, #9D8FFF)", color: "white" }}>
              View Progress
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
