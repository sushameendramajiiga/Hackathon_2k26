import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Plus, Send, X, Lock, Globe, Hash, ArrowLeft, Loader2, Copy, Check } from "lucide-react";

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function StudyRooms() {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [newRoom, setNewRoom] = useState({ name: "", description: "", subject: "", is_public: true });
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (activeRoom) {
      loadMessages(activeRoom.id);
      const unsub = base44.entities.ChatMessage.subscribe((event) => {
        if (event.data?.room_id === activeRoom.id) {
          if (event.type === "create") setMessages(prev => [...prev, event.data]);
        }
      });
      return () => unsub();
    }
  }, [activeRoom]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const init = async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      const allRooms = await base44.entities.StudyRoom.list("-created_date", 50);
      setRooms(allRooms.filter(r => r.is_public || r.host_id === me.id || (r.members || []).includes(me.id)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadMessages = async (roomId) => {
    const msgs = await base44.entities.ChatMessage.filter({ room_id: roomId }, "created_date", 100);
    setMessages(msgs);
  };

  const createRoom = async () => {
    if (!newRoom.name.trim()) return;
    setCreating(true);
    const room = await base44.entities.StudyRoom.create({
      ...newRoom,
      host_id: user.id,
      host_name: user.full_name,
      members: [user.id],
      member_names: [user.full_name],
      invite_code: generateCode(),
      max_members: 10
    });
    setRooms(prev => [room, ...prev]);
    setShowCreate(false);
    setNewRoom({ name: "", description: "", subject: "", is_public: true });
    setActiveRoom(room);
    setCreating(false);
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    const allRooms = await base44.entities.StudyRoom.list();
    const found = allRooms.find(r => r.invite_code === joinCode.toUpperCase());
    if (!found) { alert("Room not found. Check the invite code."); return; }
    if ((found.members || []).includes(user.id)) { setActiveRoom(found); setJoinCode(""); return; }
    const updated = await base44.entities.StudyRoom.update(found.id, {
      members: [...(found.members || []), user.id],
      member_names: [...(found.member_names || []), user.full_name]
    });
    setRooms(prev => prev.find(r => r.id === found.id) ? prev.map(r => r.id === found.id ? updated : r) : [...prev, updated]);
    setActiveRoom(updated);
    setJoinCode("");
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeRoom) return;
    setSending(true);
    const msg = await base44.entities.ChatMessage.create({
      room_id: activeRoom.id,
      sender_id: user.id,
      sender_name: user.full_name,
      content: input.trim(),
      message_type: "text"
    });
    setMessages(prev => [...prev, msg]);
    setInput("");
    setSending(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(activeRoom?.invite_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="animate-spin" style={{ color: "#6C63FF" }} />
    </div>
  );

  if (activeRoom) return (
    <div className="flex flex-col h-screen">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(30,30,50,0.9)" }}>
        <button onClick={() => { setActiveRoom(null); setMessages([]); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <ArrowLeft size={16} style={{ color: "#A0A0C0" }} />
        </button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(108,99,255,0.2)" }}>
          <Hash size={18} style={{ color: "#6C63FF" }} />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm" style={{ color: "#F0F0FF" }}>{activeRoom.name}</div>
          <div className="text-xs" style={{ color: "#A0A0C0" }}>
            {activeRoom.members?.length || 1} member{activeRoom.members?.length !== 1 ? "s" : ""}
            {activeRoom.subject ? ` • ${activeRoom.subject}` : ""}
          </div>
        </div>
        <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "rgba(108,99,255,0.15)", color: "#9D8FFF" }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {activeRoom.invite_code}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: "#A0A0C0" }}>
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user.id;
          return (
            <div key={msg.id || i} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1"
                  style={{ background: "rgba(108,99,255,0.3)", color: "#6C63FF" }}>
                  {(msg.sender_name || "?")[0].toUpperCase()}
                </div>
              )}
              <div className={`max-w-[70%]`}>
                {!isMe && (
                  <div className="text-xs mb-1 ml-1" style={{ color: "#A0A0C0" }}>{msg.sender_name}</div>
                )}
                <div className="px-4 py-2.5 rounded-2xl text-sm"
                  style={{
                    background: isMe ? "linear-gradient(135deg, #6C63FF, #9D8FFF)" : "rgba(255,255,255,0.07)",
                    color: isMe ? "white" : "#D0D0F0",
                    borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    border: !isMe ? "1px solid rgba(255,255,255,0.08)" : "none"
                  }}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 flex gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-xl text-sm"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0FF" }}
        />
        <button onClick={sendMessage} disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "#6C63FF", opacity: !input.trim() ? 0.5 : 1 }}>
          <Send size={16} color="white" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#F0F0FF" }}>Study Rooms</h1>
          <p className="text-sm mt-1" style={{ color: "#A0A0C0" }}>Collaborate with friends in real-time</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "linear-gradient(135deg, #6C63FF, #9D8FFF)", color: "white" }}>
          <Plus size={16} /> Create Room
        </button>
      </div>

      {/* Join by Code */}
      <div className="glass rounded-2xl p-4 mb-5 flex gap-3">
        <input
          type="text"
          value={joinCode}
          onChange={e => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Enter invite code (e.g. ABC123)"
          maxLength={6}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm font-mono"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0FF" }}
        />
        <button onClick={joinRoom} disabled={joinCode.length < 6}
          className="px-5 py-2.5 rounded-xl text-sm font-medium"
          style={{ background: "rgba(108,99,255,0.2)", color: "#6C63FF", opacity: joinCode.length < 6 ? 0.5 : 1 }}>
          Join Room
        </button>
      </div>

      {/* Rooms Grid */}
      {rooms.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Users size={48} className="mx-auto mb-4" style={{ color: "#6C63FF", opacity: 0.3 }} />
          <div className="font-semibold text-lg mb-2" style={{ color: "#F0F0FF" }}>No study rooms yet</div>
          <div className="text-sm mb-4" style={{ color: "#A0A0C0" }}>Create a room or join one with an invite code</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <button key={room.id} onClick={() => setActiveRoom(room)}
              className="glass rounded-2xl p-5 text-left hover:scale-[1.02] transition-all group"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(108,99,255,0.2)" }}>
                  <Hash size={18} style={{ color: "#6C63FF" }} />
                </div>
                <div className="flex items-center gap-1 text-xs" style={{ color: "#A0A0C0" }}>
                  {room.is_public ? <Globe size={12} /> : <Lock size={12} />}
                  {room.is_public ? "Public" : "Private"}
                </div>
              </div>
              <div className="font-semibold mb-1 truncate" style={{ color: "#F0F0FF" }}>{room.name}</div>
              {room.subject && <div className="text-xs mb-2" style={{ color: "#6C63FF" }}>{room.subject}</div>}
              {room.description && <div className="text-xs mb-3 line-clamp-2" style={{ color: "#A0A0C0" }}>{room.description}</div>}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "#A0A0C0" }}>
                  <Users size={12} />
                  {room.members?.length || 1}/{room.max_members || 10}
                </div>
                <div className="text-xs font-mono px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(108,99,255,0.1)", color: "#9D8FFF" }}>
                  {room.invite_code}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 animate-fadeInUp"
            style={{ background: "#1E1E32", border: "1px solid rgba(108,99,255,0.3)" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg" style={{ color: "#F0F0FF" }}>Create Study Room</h2>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <X size={16} style={{ color: "#A0A0C0" }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#A0A0C0" }}>Room Name *</label>
                <input type="text" value={newRoom.name} onChange={e => setNewRoom(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Physics Study Group"
                  className="w-full px-4 py-2.5 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0FF" }} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#A0A0C0" }}>Subject (optional)</label>
                <input type="text" value={newRoom.subject} onChange={e => setNewRoom(p => ({ ...p, subject: e.target.value }))}
                  placeholder="e.g. Mathematics"
                  className="w-full px-4 py-2.5 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0FF" }} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#A0A0C0" }}>Description (optional)</label>
                <textarea value={newRoom.description} onChange={e => setNewRoom(p => ({ ...p, description: e.target.value }))}
                  placeholder="What will you study here?"
                  rows={2} className="w-full px-4 py-2.5 rounded-xl text-sm resize-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0FF" }} />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setNewRoom(p => ({ ...p, is_public: true }))}
                  className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                  style={{
                    background: newRoom.is_public ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.04)",
                    color: newRoom.is_public ? "#6C63FF" : "#A0A0C0",
                    border: newRoom.is_public ? "1px solid rgba(108,99,255,0.4)" : "1px solid rgba(255,255,255,0.08)"
                  }}>
                  <Globe size={12} /> Public
                </button>
                <button onClick={() => setNewRoom(p => ({ ...p, is_public: false }))}
                  className="flex-1 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5"
                  style={{
                    background: !newRoom.is_public ? "rgba(255,101,132,0.2)" : "rgba(255,255,255,0.04)",
                    color: !newRoom.is_public ? "#FF6584" : "#A0A0C0",
                    border: !newRoom.is_public ? "1px solid rgba(255,101,132,0.4)" : "1px solid rgba(255,255,255,0.08)"
                  }}>
                  <Lock size={12} /> Private
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#A0A0C0" }}>Cancel</button>
                <button onClick={createRoom} disabled={!newRoom.name.trim() || creating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #6C63FF, #9D8FFF)", color: "white", opacity: !newRoom.name.trim() ? 0.5 : 1 }}>
                  {creating ? <Loader2 size={14} className="animate-spin" /> : null}
                  {creating ? "Creating..." : "Create Room"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
