import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Loader2, CheckCircle, XCircle, Brain, ArrowRight, Trophy } from "lucide-react";

const levelColor = { weak: "#FF6584", moderate: "#FFB347", advanced: "#6DFFB3" };
const levelLabel = { weak: "Weak Learner", moderate: "Moderate Learner", advanced: "Advanced Learner" };
const levelMsg = {
  weak: "Don't worry! We'll build a strong foundation for you step by step.",
  moderate: "Great start! With focused effort, you'll advance quickly.",
  advanced: "Impressive! We'll push your skills to the next level."
};

export default function Assessment() {
  const [subject, setSubject] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subjectId = params.get("subject_id");
    if (subjectId) loadSubjectAndGenerate(subjectId);
  }, []);

  const loadSubjectAndGenerate = async (subjectId) => {
    try {
      const sub = await base44.entities.Subject.list().then(list => list.find(s => s.id === subjectId));
      if (!sub) { navigate(createPageUrl("Subjects")); return; }
      setSubject(sub);

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 10 diagnostic multiple-choice questions for the subject "${sub.name}".
        The questions should test fundamental knowledge and span easy, medium, and hard difficulty.
        Return ONLY a JSON array with this exact format, no extra text:
        [
          {
            "question": "Question text here?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": 0
          }
        ]
        correct_answer is the 0-based index of the correct option.`,
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

      const qs = res.questions || [];
      setQuestions(qs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qIndex, answerIndex) => {
    setAnswers(prev => ({ ...prev, [qIndex]: answerIndex }));
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) setCurrentQ(c => c + 1);
  };

  const handlePrev = () => {
    if (currentQ > 0) setCurrentQ(c => c - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const correct = questions.filter((q, i) => answers[i] === q.correct_answer).length;
    const percentage = (correct / questions.length) * 100;
    const level = percentage <= 40 ? "weak" : percentage <= 70 ? "moderate" : "advanced";

    await Promise.all([
      base44.entities.Subject.update(subject.id, {
        learner_level: level,
        diagnostic_score: percentage
      }),
      base44.entities.Assessment.create({
        subject_id: subject.id,
        subject_name: subject.name,
        questions: questions.map((q, i) => ({ ...q, user_answer: answers[i] ?? -1 })),
        score: correct,
        score_percentage: percentage,
        learner_level: level,
        completed: true
      })
    ]);

    setResult({ correct, total: questions.length, percentage, level });
    setSubmitting(false);
  };

  const handleGoToStudyPlan = async () => {
    // Trigger study plan generation
    navigate(createPageUrl(`StudyPlans?subject_id=${subject.id}&generate=true`));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="w-12 h-12 rounded-2xl animate-pulse-glow" style={{ background: "linear-gradient(135deg, #6C63FF, #FF6584)" }} />
      <div className="font-medium" style={{ color: "#6C63FF" }}>Generating diagnostic questions...</div>
      <div className="text-sm" style={{ color: "#A0A0C0" }}>Powered by AI • This may take a moment</div>
    </div>
  );

  if (result) return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-md animate-fadeInUp">
        <div className="glass rounded-3xl p-8 text-center" style={{ border: `2px solid ${levelColor[result.level]}40` }}>
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: `${levelColor[result.level]}20`, border: `2px solid ${levelColor[result.level]}` }}>
            <Trophy size={36} style={{ color: levelColor[result.level] }} />
          </div>
          <div className="text-5xl font-bold mb-2" style={{ color: levelColor[result.level] }}>
            {Math.round(result.percentage)}%
          </div>
          <div className="text-lg font-semibold mb-1" style={{ color: "#F0F0FF" }}>
            {levelLabel[result.level]}
          </div>
          <div className="text-sm mb-2" style={{ color: "#A0A0C0" }}>
            {result.correct} / {result.total} correct
          </div>
          <div className="text-sm mb-6 px-4" style={{ color: "#A0A0C0" }}>
            {levelMsg[result.level]}
          </div>
          <button onClick={handleGoToStudyPlan}
            className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${levelColor[result.level]}, ${levelColor[result.level]}88)`, color: "white" }}>
            View My Study Plan <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  if (!questions.length) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div style={{ color: "#FF6584" }}>Failed to generate questions.</div>
        <button onClick={() => navigate(createPageUrl("Subjects"))} className="mt-4 underline text-sm" style={{ color: "#6C63FF" }}>
          Back to Subjects
        </button>
      </div>
    </div>
  );

  const q = questions[currentQ];
  const progress = Object.keys(answers).length / questions.length * 100;

  return (
    <div className="min-h-screen p-6 flex items-start justify-center">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={18} style={{ color: "#6C63FF" }} />
            <span className="text-sm font-medium" style={{ color: "#6C63FF" }}>
              Diagnostic Assessment
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#F0F0FF" }}>{subject?.name}</h1>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6C63FF, #FF6584)" }} />
            </div>
            <span className="text-xs" style={{ color: "#A0A0C0" }}>
              {Object.keys(answers).length}/{questions.length} answered
            </span>
          </div>
        </div>

        {/* Question Card */}
        <div className="glass rounded-2xl p-6 mb-4 animate-fadeInUp" key={currentQ}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: "rgba(108,99,255,0.2)", color: "#6C63FF" }}>
              Q{currentQ + 1} of {questions.length}
            </span>
          </div>
          <p className="text-base font-medium mb-6" style={{ color: "#F0F0FF" }}>{q.question}</p>
          <div className="space-y-3">
            {q.options.map((opt, i) => {
              const selected = answers[currentQ] === i;
              return (
                <button key={i} onClick={() => handleAnswer(currentQ, i)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                  style={{
                    background: selected ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.04)",
                    border: selected ? "1px solid rgba(108,99,255,0.6)" : "1px solid rgba(255,255,255,0.08)",
                    color: selected ? "#C8C5FF" : "#A0A0C0"
                  }}>
                  <span className="font-medium mr-3" style={{ color: selected ? "#6C63FF" : "#555" }}>
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3">
          <button onClick={handlePrev} disabled={currentQ === 0}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-opacity"
            style={{ background: "rgba(255,255,255,0.05)", color: "#A0A0C0", opacity: currentQ === 0 ? 0.4 : 1 }}>
            Previous
          </button>
          <div className="flex-1 flex gap-1">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentQ(i)}
                className="flex-1 h-1.5 rounded-full transition-all"
                style={{
                  background: answers[i] !== undefined
                    ? "#6C63FF"
                    : i === currentQ ? "rgba(108,99,255,0.5)" : "rgba(255,255,255,0.1)"
                }} />
            ))}
          </div>
          {currentQ < questions.length - 1 ? (
            <button onClick={handleNext}
              className="px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "rgba(108,99,255,0.2)", color: "#6C63FF" }}>
              Next
            </button>
          ) : (
            <button onClick={handleSubmit}
              disabled={submitting || Object.keys(answers).length < questions.length}
              className="px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-opacity"
              style={{
                background: "linear-gradient(135deg, #6C63FF, #9D8FFF)",
                color: "white",
                opacity: Object.keys(answers).length < questions.length ? 0.5 : 1
              }}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
