import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  Send, Bot, User, Loader2, Sparkles, BookOpen, Clock, Brain, Zap,
  FileText, MessageSquare, Lightbulb, Target, ChevronRight, X, Upload
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const MODES = [
  { id: "chat", label: "Chat", icon: MessageSquare, desc: "General study help" },
  { id: "feedback", label: "Feedback", icon: FileText, desc: "Submit work for feedback" },
  { id: "explain", label: "Deep Explain", icon: Brain, desc: "Explain complex topics" },
  { id: "suggest", label: "Study Tips", icon: Target, desc: "Personalized suggestions" },
];

const SUGGESTIONS = [
  { icon: BookOpen, text: "Help me understand integration in calculus", mode: "chat" },
  { icon: Brain, text: "What are the best techniques to memorize formulas?", mode: "chat" },
  { icon: Clock, text: "Create a study schedule for my upcoming exam", mode: "chat" },
  { icon: Zap, text: "Motivate me to study for the next 2 hours", mode: "chat" },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyId, setHistoryId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [mode, setMode] = useState("chat");
  const [essayText, setEssayText] = useState("");
  const [showEssayInput, setShowEssayInput] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadHistory();
    Promise.all([
      base44.entities.Subject.list("-created_date", 10),
      base44.entities.Assessment.list("-created_date", 10),
    ]).then(([subs, asses]) => {
      setSubjects(subs);
      setAssessments(asses);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadHistory = async () => {
    const user = await base44.auth.me();
    const histories = await base44.entities.AIChatHistory.filter({ owner_id: user.id });
    if (histories.length > 0) {
      setHistoryId(histories[0].id);
      setMessages(histories[0].messages || []);
    }
  };

  const saveHistory = async (msgs) => {
    const user = await base44.auth.me();
    if (historyId) {
      await base44.entities.AIChatHistory.update(historyId, { messages: msgs });
    } else {
      const record = await base44.entities.AIChatHistory.create({ owner_id: user.id, messages: msgs });
      setHistoryId(record.id);
    }
  };

  const buildSystemContext = () => {
    const subjectList = subjects.map(s => `${s.name} (level: ${s.learner_level || "not assessed"})`).join(", ");
    const weakSubjects = subjects.filter(s => s.learner_level === "weak").map(s => s.name).join(", ");
    return `You are RGM Study Assistant, an expert AI tutor for first-generation university students.
Subjects the student is studying: ${subjectList || "none yet"}.
${weakSubjects ? `Weak areas identified: ${weakSubjects}.` : ""}
Always be encouraging, specific, and use examples relevant to these subjects.
Use markdown formatting (headers, bullet points, code blocks, bold) for clarity.`;
  };

  const buildPrompt = (msg, essay) => {
    const history = messages.slice(-6).map(m => `${m.role === "user" ? "Student" : "Assistant"}: ${m.content}`).join("\n");
    const ctx = buildSystemContext();

    if (mode === "feedback" && essay) {
      return `${ctx}

The student has submitted the following essay/answer for feedback:
---
${essay}
---

Student's question/context: ${msg || "Please provide detailed feedback."}

Provide structured feedback covering:
1. **Strengths** – what they did well
2. **Areas for Improvement** – specific issues with examples
3. **Suggestions** – concrete ways to improve
4. **Score estimate** – rough grade or rating out of 10 with reasoning

Conversation history:
${history}`;
    }

    if (mode === "explain") {
      return `${ctx}

The student wants a deep explanation of: "${msg}"

Provide a thorough explanation including:
1. **Core Concept** – clear definition
2. **How It Works** – step-by-step breakdown
3. **Real-World Example** – relatable to their subjects
4. **Common Misconceptions** – what students often get wrong
5. **Practice Tip** – one thing they can do to master this

Conversation history:
${history}`;
    }

    if (mode === "suggest") {
      const weakSubjects = subjects.filter(s => s.learner_level === "weak").map(s => s.name);
      return `${ctx}

The student is asking for personalized study material suggestions.
${weakSubjects.length > 0 ? `Their weak areas are: ${weakSubjects.join(", ")}.` : ""}
Student's message: ${msg}

Provide:
1. **Recommended Topics to Study Now** – based on weak areas
2. **Study Resources** – specific types of resources (textbook chapters, YouTube channels, practice sets)
3. **Practice Questions** – 2–3 sample questions to try
4. **This Week's Focus** – one actionable goal

Conversation history:
${history}`;
    }

    // default chat
    return `${ctx}

Conversation history:
${history}

Student: ${msg}

Respond as the assistant:`;
  };

  const sendMessage = async (text, essay) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setShowEssayInput(false);

    const displayContent = mode === "feedback" && essay
      ? `📝 **Submitted for feedback:**\n\n${essay}\n\n---\n${msg}`
      : msg;

    const userMsg = { role: "user", content: displayContent, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    const prompt = buildPrompt(msg, essay);
    const res = await base44.integrations.Core.InvokeLLM({ prompt });

    const aiMsg = { role: "assistant", content: res, timestamp: new Date().toISOString() };
    const finalMessages = [...newMessages, aiMsg];
    setMessages(finalMessages);
    await saveHistory(finalMessages);
    setLoading(false);
    setEssayText("");
  };

  const handleFeedbackSubmit = () => {
    if (!essayText.trim()) return;
    sendMessage(input || "Please provide detailed feedback on my work.", essayText);
  };

  const clearHistory = async () => {
    if (!confirm("Clear all chat history?")) return;
    if (historyId) await base44.entities.AIChatHistory.update(historyId, { messages: [] });
    setMessages([]);
  };

  const handleSuggestionClick = (suggestion) => {
    setMode(suggestion.mode || "chat");
    sendMessage(suggestion.text);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#1A1A2E" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6C63FF, #FF6584)" }}>
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <h1 className="font-bold" style={{ color: "#F0F0FF" }}>RGM AI Study Assistant</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs" style={{ color: "#A0A0C0" }}>Online • Personalized for you</span>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(255,101,132,0.1)", color: "#FF6584", border: "1px solid rgba(255,101,132,0.2)" }}>
            Clear History
          </button>
        )}
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ background: "#16213E", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {MODES.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            onClick={() => { setMode(id); setShowEssayInput(id === "feedback"); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium flex-shrink-0 transition-all"
            style={{
              background: mode === id ? "rgba(108,99,255,0.25)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${mode === id ? "#6C63FF" : "rgba(255,255,255,0.08)"}`,
              color: mode === id ? "#C8C5FF" : "#A0A0C0"
            }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Mode description bar */}
      {mode !== "chat" && (
        <div className="px-4 py-2 text-xs" style={{ background: "rgba(108,99,255,0.08)", color: "#A0A0C0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {mode === "feedback" && "📝 Paste your essay or practice answer below, then describe what kind of feedback you need."}
          {mode === "explain" && "🔬 Ask me to explain any complex topic — I'll break it down with examples from your subjects."}
          {mode === "suggest" && "🎯 I'll suggest study materials and practice questions based on your weak areas and goals."}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #6C63FF22, #FF658422)" }}>
                <Sparkles size={32} style={{ color: "#6C63FF" }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: "#F0F0FF" }}>Your Personalized AI Tutor</h2>
              <p className="text-sm" style={{ color: "#A0A0C0" }}>
                {subjects.length > 0
                  ? `Helping you master: ${subjects.map(s => s.name).join(", ")}`
                  : "Ask me anything about your studies"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTIONS.map(s => (
                <button key={s.text} onClick={() => handleSuggestionClick(s)}
                  className="glass p-4 rounded-xl text-left hover:glow transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <s.icon size={18} className="mb-2" style={{ color: "#6C63FF" }} />
                  <p className="text-sm" style={{ color: "#A0A0C0" }}>{s.text}</p>
                </button>
              ))}
            </div>
            {subjects.some(s => s.learner_level === "weak") && (
              <button
                onClick={() => { setMode("suggest"); sendMessage("What should I focus on based on my weak areas?"); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "rgba(255,101,132,0.15)", border: "1px solid rgba(255,101,132,0.3)", color: "#FF6584" }}>
                <Target size={16} />
                Get personalized suggestions for weak areas
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                  style={{ background: "linear-gradient(135deg, #6C63FF, #FF6584)" }}>
                  <Sparkles size={14} color="white" />
                </div>
              )}
              <div className="max-w-[78%]">
                <div className="px-4 py-3 rounded-2xl text-sm"
                  style={{
                    background: msg.role === "user" ? "linear-gradient(135deg, #6C63FF, #9D8FFF)" : "rgba(255,255,255,0.06)",
                    color: "#F0F0FF",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    border: msg.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none"
                  }}>
                  {msg.role === "user" ? (
                    <ReactMarkdown className="prose prose-invert prose-sm max-w-none">{msg.content}</ReactMarkdown>
                  ) : (
                    <ReactMarkdown
                      className="prose prose-invert prose-sm max-w-none"
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="ml-4 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="ml-4 mb-2 space-y-1 list-decimal">{children}</ol>,
                        li: ({ children }) => <li className="mb-0.5">{children}</li>,
                        h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-3" style={{ color: "#C8C5FF" }}>{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-2" style={{ color: "#C8C5FF" }}>{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2" style={{ color: "#B0ADFF" }}>{children}</h3>,
                        code: ({ children }) => (
                          <code className="px-1.5 py-0.5 rounded text-xs"
                            style={{ background: "rgba(108,99,255,0.3)", color: "#C8C5FF" }}>{children}</code>
                        ),
                        strong: ({ children }) => <strong style={{ color: "#C8C5FF" }}>{children}</strong>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 pl-3 my-2 italic"
                            style={{ borderColor: "#6C63FF", color: "#A0A0C0" }}>{children}</blockquote>
                        ),
                      }}>
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-1"
                  style={{ background: "rgba(108,99,255,0.3)" }}>
                  <User size={14} style={{ color: "#9D8FFF" }} />
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #6C63FF, #FF6584)" }}>
              <Sparkles size={14} color="white" />
            </div>
            <div className="px-4 py-3 rounded-2xl flex items-center gap-2"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: "#6C63FF", animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span className="text-xs" style={{ color: "#A0A0C0" }}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Essay Input (Feedback mode) */}
      {(mode === "feedback" && showEssayInput) && (
        <div className="px-4 pt-3" style={{ background: "#1A1A2E", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium" style={{ color: "#A0A0C0" }}>Paste your essay / practice answer:</span>
            <button onClick={() => setShowEssayInput(false)}><X size={14} style={{ color: "#A0A0C0" }} /></button>
          </div>
          <textarea
            value={essayText}
            onChange={e => setEssayText(e.target.value)}
            placeholder="Paste your essay, answer, or practice question response here..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl text-sm resize-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(108,99,255,0.3)", color: "#F0F0FF" }}
          />
        </div>
      )}

      {/* Input */}
      <div className="p-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#1A1A2E" }}>
        <div className="flex gap-3 max-w-4xl mx-auto">
          {mode === "feedback" && !showEssayInput && (
            <button
              onClick={() => setShowEssayInput(true)}
              className="px-3 py-3 rounded-xl text-xs font-medium flex items-center gap-1.5 flex-shrink-0 transition-all"
              style={{ background: "rgba(108,99,255,0.15)", border: "1px solid rgba(108,99,255,0.3)", color: "#9D8FFF" }}>
              <Upload size={14} /> Add Work
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                mode === "feedback" && essayText ? handleFeedbackSubmit() : sendMessage();
              }
            }}
            placeholder={
              mode === "feedback" ? "Describe what feedback you need..." :
              mode === "explain" ? "What topic do you want explained?" :
              mode === "suggest" ? "What are your current learning goals?" :
              "Ask me anything about your studies..."
            }
            className="flex-1 px-4 py-3 rounded-xl text-sm"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0FF" }}
          />
          <button
            onClick={mode === "feedback" && essayText ? handleFeedbackSubmit : () => sendMessage()}
            disabled={(!input.trim() && !(mode === "feedback" && essayText)) || loading}
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #6C63FF, #FF6584)",
              opacity: ((!input.trim() && !(mode === "feedback" && essayText)) || loading) ? 0.5 : 1
            }}>
            {loading ? <Loader2 size={18} color="white" className="animate-spin" /> : <Send size={18} color="white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
