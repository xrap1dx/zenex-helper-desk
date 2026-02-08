import { useState, useEffect, useRef } from "react";
import { Send, Loader2, ArrowLeft, Star } from "lucide-react";
import { userSupabase as supabase } from "@/lib/supabaseClient";
import type { ChatMessage, ChatSession } from "@/lib/types";
import { DEPARTMENTS } from "@/lib/departments";

type ChatStep = "welcome" | "name" | "issue" | "chat" | "rating" | "done";
const STORAGE_KEY = "zenex_chat_session";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface EmbedChatWindowProps {
  agentsOnline?: boolean;
  isMobile?: boolean;
}

export function EmbedChatWindow({ agentsOnline = true, isMobile = false }: EmbedChatWindowProps) {
  const [step, setStep] = useState<ChatStep>("welcome");
  const [visitorName, setVisitorName] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.chatId) {
          setStep(s.step);
          setVisitorName(s.visitorName);
          setChatId(s.chatId);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsRestoring(false);
  }, []);

  useEffect(() => {
    if (!isRestoring) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, visitorName, chatId }));
    }
  }, [step, visitorName, chatId, isRestoring]);

  useEffect(() => {
    if (chatId && !isRestoring) {
      const fetchChat = async () => {
        const { data } = await supabase
          .from("chat_sessions")
          .select("messages, status, rating")
          .eq("id", chatId)
          .single();
        if (data) {
          setMessages((data.messages || []) as ChatMessage[]);
          if (data.status === "closed" && data.rating == null && step === "chat") setStep("rating");
          if (data.rating != null) setStep("done");
        }
      };
      fetchChat();

      const channel = supabase
        .channel(`embed-chat:${chatId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chat_sessions", filter: `id=eq.${chatId}` },
          (payload) => {
            const u = payload.new as ChatSession;
            setMessages(u.messages || []);
            if (u.status === "closed" && u.rating == null && step === "chat") setStep("rating");
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [chatId, isRestoring]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startChat = async (department: string) => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({
        visitor_name: visitorName,
        department,
        status: "waiting",
        messages: [
          {
            id: generateUUID(),
            content: "Please explain your issue - an agent will be with you shortly.",
            sender_type: "staff",
            sender_name: "System",
            timestamp: new Date().toISOString(),
          },
        ],
      })
      .select()
      .single();
    if (!error && data) {
      setChatId(data.id);
      setMessages(data.messages as ChatMessage[]);
      setStep("chat");
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId) return;
    const msg: ChatMessage = {
      id: generateUUID(),
      content: newMessage.trim(),
      sender_type: "visitor",
      sender_name: visitorName,
      timestamp: new Date().toISOString(),
    };
    const updated = [...messages, msg];
    setMessages(updated);
    setNewMessage("");
    await supabase
      .from("chat_sessions")
      .update({ messages: updated, updated_at: new Date().toISOString() })
      .eq("id", chatId);
  };

  const submitRating = async () => {
    if (!chatId || rating === 0) return;
    await supabase.from("chat_sessions").update({ rating }).eq("id", chatId);
    setStep("done");
  };

  const handleNewChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStep("welcome");
    setVisitorName("");
    setChatId(null);
    setMessages([]);
    setRating(0);
  };

  const s = {
    container: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#fff", backgroundColor: "#0a0d1f", height: isMobile ? "100%" : "auto", display: "flex", flexDirection: "column" as const },
    button: { background: "#6366f1", border: "none", borderRadius: "8px", padding: "12px 20px", color: "#fff", fontWeight: 500, cursor: "pointer", width: "100%", fontSize: "14px" },
    input: { width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "14px", outline: "none" },
    issueBtn: { width: "100%", padding: "12px 14px", textAlign: "left" as const, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", cursor: "pointer", color: "#fff" },
    visitorMsg: { maxWidth: "85%", padding: "10px 14px", borderRadius: "12px 12px 4px 12px", marginLeft: "auto", background: "#6366f1", color: "#fff" },
    staffMsg: { maxWidth: "85%", padding: "10px 14px", borderRadius: "12px 12px 12px 4px", background: "rgba(255,255,255,0.08)", color: "#fff" },
  };

  if (isRestoring) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", ...s.container }}><Loader2 className="h-5 w-5 animate-spin" style={{ color: "#6366f1" }} /></div>;

  if (step === "welcome") {
    return (
      <div style={{ padding: isMobile ? "32px 20px" : "20px", flex: 1, display: "flex", flexDirection: "column", justifyContent: isMobile ? "center" : "flex-start", ...s.container }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>Hi there! 👋 How can we help you today?</h3>
        </div>
        {!agentsOnline && (
          <div style={{ padding: "14px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "rgba(255,255,255,0.8)" }}>
            <strong style={{ color: "#ef4444" }}>No agents online.</strong>
            <p style={{ margin: "8px 0 0 0", color: "rgba(255,255,255,0.6)" }}>Feel free to start a chat and we'll respond shortly.</p>
          </div>
        )}
        <button style={s.button} onClick={() => setStep("name")}>Start Chat</button>
      </div>
    );
  }

  if (step === "name") {
    return (
      <div style={{ padding: isMobile ? "32px 20px" : "20px", flex: 1, display: "flex", flexDirection: "column", justifyContent: isMobile ? "center" : "flex-start", ...s.container }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>Great! What's your name so we can assist you better?</h3>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginBottom: "12px" }}>Your Name</p>
        <input style={s.input} placeholder="Enter your name" value={visitorName} onChange={(e) => setVisitorName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && visitorName.trim()) setStep("issue"); }} autoFocus />
        <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
          <button style={{ ...s.button, background: "rgba(255,255,255,0.08)", flex: 1 }} onClick={() => setStep("welcome")}>Back</button>
          <button style={{ ...s.button, flex: 1, opacity: visitorName.trim() ? 1 : 0.5 }} disabled={!visitorName.trim()} onClick={() => setStep("issue")}>Start Chat</button>
        </div>
      </div>
    );
  }

  if (step === "issue") {
    return (
      <div style={{ padding: isMobile ? "24px 20px" : "20px", flex: 1, display: "flex", flexDirection: "column", ...s.container }}>
        <p style={{ fontSize: "11px", letterSpacing: "1px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: "12px" }}>Select Inquiry</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, overflowY: "auto" }}>
          {DEPARTMENTS.map((dept) => (
            <button key={dept.id} onClick={() => startChat(dept.id)} disabled={isLoading} style={s.issueBtn}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
            >
              <span style={{ fontWeight: 500, fontSize: "14px" }}>{dept.name}</span>
            </button>
          ))}
        </div>
        {isLoading && <div style={{ display: "flex", justifyContent: "center", padding: "14px" }}><Loader2 className="h-5 w-5 animate-spin" style={{ color: "#6366f1" }} /></div>}
      </div>
    );
  }

  if (step === "rating") {
    return (
      <div style={{ padding: "32px 20px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", ...s.container }}>
        <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Rate Your Experience</h3>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>How was your support experience?</p>
        <div style={{ display: "flex", gap: "8px" }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <Star style={{ width: "36px", height: "36px", color: n <= rating ? "#facc15" : "rgba(255,255,255,0.2)", fill: n <= rating ? "#facc15" : "none" }} />
            </button>
          ))}
        </div>
        <button style={{ ...s.button, opacity: rating > 0 ? 1 : 0.5 }} disabled={rating === 0} onClick={submitRating}>Submit Rating</button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={{ padding: "32px 20px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", ...s.container }}>
        <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Thank you! 🎉</h3>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>Your feedback helps us improve.</p>
        <button style={{ ...s.button, background: "rgba(255,255,255,0.08)", width: "auto", padding: "10px 24px" }} onClick={handleNewChat}>Start New Chat</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: isMobile ? "100%" : "380px", ...s.container }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={handleNewChat} style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
          <ArrowLeft className="h-3.5 w-3.5" /> New Chat
        </button>
        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>{visitorName}</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.map((msg) => (
          <div key={msg.id} style={msg.sender_type === "visitor" ? s.visitorMsg : s.staffMsg}>
            <p style={{ fontSize: "14px", margin: 0, lineHeight: 1.5 }}>{msg.content}</p>
            <span style={{ fontSize: "11px", opacity: 0.6, marginTop: "4px", display: "block" }}>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: isMobile ? "16px" : "12px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            style={s.input}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            style={{ background: "#6366f1", border: "none", borderRadius: "8px", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: newMessage.trim() ? 1 : 0.5, flexShrink: 0 }}
          >
            <Send style={{ width: "16px", height: "16px", color: "#fff" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
