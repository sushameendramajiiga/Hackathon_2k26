import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Play, Pause, RotateCcw, Coffee, BookOpen, Check, Plus, Trash2 } from "lucide-react";

const MODES = [
  { key: "focus", label: "Focus", mins: 25, color: "#6C63FF" },
  { key: "short", label: "Short Break", mins: 5, color: "#6DFFB3" },
  { key: "long", label: "Long Break", mins: 15, color: "#FFB347" },
];

export default function Pomodoro() {
  const [mode, setMode] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(MODES[0].mins * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    base44.entities.Subject.list("-created_date", 20).then(setSubjects).catch(() => {});
    const saved = localStorage.getItem("pomodoro_tasks");
    if (saved) setTasks(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("pomodoro_tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    setSecondsLeft(MODES[mode].mins * 60);
    setRunning(false);
    clearInterval(intervalRef.current);
  }, [mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (MODES[mode].key === "focus") setSessions(s => s + 1);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const total = MODES[mode].mins * 60;
  const progress = (secondsLeft / total) * 100;
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const color = MODES[mode].color;

  const circumference = 2 * Math.PI * 110;
  const dashOffset = circumference * (1 - (100 - progress) / 100);

  const reset = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    setSecondsLeft(MODES[mode].mins * 60);
  };

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks(prev => [...prev, { id: Date.now(), text: newTask.trim(), done: false }]);
    setNewTask("");
  };

  const toggleTask = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#F0F0FF" }}>Pomodoro Timer</h1>
        <p className="text-sm mt-1" style={{ color: "#A0A0C0" }}>Stay focused with timed study sessions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timer */}
        <div className="glass rounded-2xl p-8">
          {/* Mode Selector */}
          <div className="flex gap-2 mb-8">
            {MODES.map((m, i) => (
              <button key={m.key} onClick={() => setMode(i)}
                className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: mode === i ? `${m.color}25` : "rgba(255,255,255,0.05)",
                  color: mode === i ? m.color : "#A0A0C0",
                  border: mode === i ? `1px solid ${m.color}40` : "1px solid rgba(255,255,255,0.08)"
                }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Circular Timer */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-64 h-64 flex items-center justify-center">
              <svg width="264" height="264" className="absolute">
                <circle cx="132" cy="132" r="110"
                  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle cx="132" cy="132" r="110"
                  fill="none"
                  stroke={color}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="pomodoro-ring transition-all duration-1000"
                  style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
                />
              </svg>
              <div className="relative z-10 text-center">
                <div className="text-6xl font-bold tabular-nums" style={{ color: "#F0F0FF" }}>
                  {mins}:{secs}
                </div>
                <div className="text-sm mt-1" style={{ color }}>
                  {MODES[mode].label}
                </div>
                {sessions > 0 && (
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full" style={{ background: color }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={reset} className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)" }}>
              <RotateCcw size={18} style={{ color: "#A0A0C0" }} />
            </button>
            <button onClick={() => setRunning(r => !r)}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}88)`,
                boxShadow: `0 0 24px ${color}50`
              }}>
              {running ? <Pause size={24} color="white" /> : <Play size={24} color="white" />}
            </button>
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)" }}>
              <span className="text-sm font-bold" style={{ color: "#A0A0C0" }}>{sessions}</span>
            </div>
          </div>

          {/* Subject Selector */}
          <div className="mt-6">
            <label className="block text-xs mb-2" style={{ color: "#A0A0C0" }}>Studying</label>
            <select value={selectedSubject || ""} onChange={e => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0FF" }}>
              <option value="">Select a subject...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Task Checklist */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Check size={18} style={{ color: "#6C63FF" }} />
            <h2 className="font-semibold" style={{ color: "#F0F0FF" }}>Session Tasks</h2>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.2)", color: "#9D8FFF" }}>
              {tasks.filter(t => t.done).length}/{tasks.length}
            </span>
          </div>

          {/* Add Task */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTask()}
              placeholder="Add a task..."
              className="flex-1 px-3 py-2 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#F0F0FF" }}
            />
            <button onClick={addTask}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "#6C63FF" }}>
              <Plus size={16} color="white" />
            </button>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: "#A0A0C0" }}>
                Add tasks for this session
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl group"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <button onClick={() => toggleTask(task.id)}
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{
                      background: task.done ? "#6DFFB3" : "transparent",
                      border: task.done ? "none" : "1.5px solid rgba(255,255,255,0.2)"
                    }}>
                    {task.done && <Check size={12} color="#0F0F1A" strokeWidth={3} />}
                  </button>
                  <span className="flex-1 text-sm" style={{
                    color: task.done ? "#A0A0C0" : "#F0F0FF",
                    textDecoration: task.done ? "line-through" : "none"
                  }}>
                    {task.text}
                  </span>
                  <button onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "#FF6584" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Session Stats */}
          <div className="mt-5 pt-4 border-t grid grid-cols-2 gap-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: "#6C63FF" }}>{sessions}</div>
              <div className="text-xs" style={{ color: "#A0A0C0" }}>Sessions Done</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: "#6DFFB3" }}>
                {Math.round(sessions * MODES[0].mins)}
              </div>
              <div className="text-xs" style={{ color: "#A0A0C0" }}>Minutes Focused</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
