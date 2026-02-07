import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, ArrowLeft } from "lucide-react";
import { userSupabase as supabase } from "@/lib/supabaseClient";
import { TypingIndicator } from "./TypingIndicator";

// Polyfill for crypto.randomUUID
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface Message {
  id: string;
  content: string;
  sender_type: "visitor" | "staff";
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
}

interface IssueOption {
  id: string;
  label: string;
  description: string;
}

type ChatStep = "welcome" | "name" | "issue" | "chat";

const STORAGE_KEY = "zenex_chat_session";

interface ChatSession {
  step: ChatStep;
  visitorName: string;
  ticketId: string | null;
  sessionId: string;
  selectedIssue: string | null;
}

const issueOptions: IssueOption[] = [
  { id: "general", label: "💬 General Question", description: "I have a question about your services" },
  { id: "billing", label: "💳 Billing & Payments", description: "Issues with payments, refunds, or invoices" },
  { id: "technical", label: "🔧 Technical Support", description: "Something isn't working correctly" },
  { id: "appeal", label: "⚖️ Appeal a Decision", description: "Contest a ban or account action" },
  { id: "legal", label: "📋 Legal & Compliance", description: "GDPR, data requests, legal matters" },
  { id: "partnership", label: "🤝 Partnership Inquiry", description: "Business partnerships or collaborations" },
];

interface EmbedChatWindowProps {
  agentsOnline?: boolean;
  isMobile?: boolean;
}

export function EmbedChatWindow({ agentsOnline = true, isMobile = false }: EmbedChatWindowProps) {
  const [step, setStep] = useState<ChatStep>("welcome");
  const [visitorName, setVisitorName] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [staffTyping, setStaffTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef<string>(generateUUID());
  const [isRestoring, setIsRestoring] = useState(true);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restore session
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const session: ChatSession = JSON.parse(saved);
        if (session.ticketId) {
          setStep(session.step);
          setVisitorName(session.visitorName);
          setTicketId(session.ticketId);
          sessionId.current = session.sessionId;
          setSelectedIssue(session.selectedIssue);
        }
      } catch (e) {
        console.error("Failed to restore chat session:", e);
      }
    }
    setIsRestoring(false);
  }, []);

  // Save session
  useEffect(() => {
    if (!isRestoring) {
      const session: ChatSession = { step, visitorName, ticketId, sessionId: sessionId.current, selectedIssue };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [step, visitorName, ticketId, selectedIssue, isRestoring]);

  useEffect(() => { fetchDepartments(); }, []);

  useEffect(() => {
    if (ticketId && !isRestoring) fetchMessages();
  }, [ticketId, isRestoring]);

  // Realtime messages + typing indicator
  useEffect(() => {
    if (ticketId) {
      const channel = supabase
        .channel(`messages:${ticketId}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `ticket_id=eq.${ticketId}`,
        }, (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => prev.find((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        })
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `id=eq.${ticketId}`,
        }, (payload: { new: { staff_typing?: boolean } }) => {
          if (payload.new.staff_typing !== undefined) {
            setStaffTyping(payload.new.staff_typing);
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, staffTyping]);

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("*");
    if (data) setDepartments(data);
  };

  const fetchMessages = async () => {
    if (!ticketId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  const getDepartmentForIssue = (issueId: string): Department | null => {
    const mapping: Record<string, string> = {
      general: "Customer Support",
      billing: "Client Relations Team",
      technical: "Customer Support",
      appeal: "Appeals Team",
      legal: "Legal & Compliance Team",
      partnership: "Client Relations Team",
    };
    const deptName = mapping[issueId];
    return departments.find((d) => d.name.includes(deptName.split(" ")[0])) || departments[0] || null;
  };

  const startChat = async (issueId: string) => {
    const dept = getDepartmentForIssue(issueId);
    if (!dept) return;

    setSelectedIssue(issueId);
    setIsLoading(true);

    const issue = issueOptions.find((i) => i.id === issueId);
    const subject = issue?.label.replace(/^[^\s]+\s/, "") || "General Inquiry";

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        visitor_name: visitorName,
        department_id: dept.id,
        session_id: sessionId.current,
        status: "open",
        subject,
      })
      .select()
      .single();

    if (!error && data) {
      setTicketId(data.id);
      setStep("chat");

      await supabase.from("messages").insert({
        ticket_id: data.id,
        sender_type: "staff",
        content: `Hi ${visitorName}! 👋 Welcome to Zenex Support. You've reached us about "${subject}". A team member will be with you shortly.`,
      });

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("ticket_id", data.id)
        .order("created_at", { ascending: true });
      if (msgs) setMessages(msgs as Message[]);
    }

    setIsLoading(false);
  };

  // Update visitor typing status
  const updateVisitorTyping = useCallback(async (isTyping: boolean) => {
    if (!ticketId) return;
    await supabase.from("tickets").update({ visitor_typing: isTyping, typing_updated_at: new Date().toISOString() }).eq("id", ticketId);
  }, [ticketId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Set typing indicator
    updateVisitorTyping(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    // Reset after 2 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      updateVisitorTyping(false);
    }, 2000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !ticketId) return;

    const content = newMessage.trim();
    setNewMessage("");
    updateVisitorTyping(false);

    await supabase.from("messages").insert({
      ticket_id: ticketId,
      sender_type: "visitor",
      content,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNewChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    sessionId.current = generateUUID();
    setStep("welcome");
    setVisitorName("");
    setTicketId(null);
    setMessages([]);
    setSelectedIssue(null);
  };

  const styles = {
    container: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: "#fff",
      backgroundColor: "#0a0d1f",
      height: isMobile ? "100%" : "auto",
      display: "flex",
      flexDirection: "column" as const,
    },
    button: {
      background: "#6366f1",
      border: "none",
      borderRadius: "8px",
      padding: "12px 20px",
      color: "#fff",
      fontWeight: 500,
      cursor: "pointer",
      width: "100%",
      fontSize: "14px",
      transition: "background 0.15s",
    },
    input: {
      width: "100%",
      padding: "12px 14px",
      background: "rgba(255, 255, 255, 0.06)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "8px",
      color: "#fff",
      fontSize: "14px",
      outline: "none",
    },
    issueButton: {
      width: "100%",
      padding: "12px 14px",
      textAlign: "left" as const,
      background: "rgba(255, 255, 255, 0.03)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
      borderRadius: "8px",
      cursor: "pointer",
      transition: "border-color 0.15s, background 0.15s",
      color: "#fff",
    },
    visitorMessage: {
      maxWidth: "85%",
      padding: "10px 14px",
      borderRadius: "12px 12px 4px 12px",
      marginLeft: "auto",
      background: "#6366f1",
      color: "#fff",
    },
    staffMessage: {
      maxWidth: "85%",
      padding: "10px 14px",
      borderRadius: "12px 12px 12px 4px",
      background: "rgba(255, 255, 255, 0.08)",
      color: "#fff",
    },
  };

  if (isRestoring) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: isMobile ? "100%" : "300px", ...styles.container }}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#6366f1" }} />
      </div>
    );
  }

  if (step === "welcome") {
    return (
      <div style={{ padding: isMobile ? "32px 20px" : "20px", flex: 1, display: "flex", flexDirection: "column", justifyContent: isMobile ? "center" : "flex-start", ...styles.container }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "#6366f1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "28px"
          }}>💬</div>
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>Welcome to Zenex Support</h3>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
            We're here to help! Start a conversation.
          </p>
        </div>
        
        {/* Agent status message */}
        {!agentsOnline && (
          <div style={{
            padding: "14px 16px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "rgba(255,255,255,0.8)",
            lineHeight: 1.5
          }}>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#ef4444" }}>No agents online right now.</strong>
            </p>
            <p style={{ margin: "8px 0 0 0", color: "rgba(255,255,255,0.6)" }}>
              Feel free to start a chat and we'll get back to you shortly. For urgent inquiries, please contact us on Discord.
            </p>
          </div>
        )}
        
        <button style={styles.button} onClick={() => setStep("name")}>
          Start Chat
        </button>
      </div>
    );
  }

  if (step === "name") {
    return (
      <div style={{ padding: isMobile ? "32px 20px" : "20px", flex: 1, display: "flex", flexDirection: "column", justifyContent: isMobile ? "center" : "flex-start", ...styles.container }}>
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>What's your name?</h3>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>So our team knows who they're talking to.</p>
        </div>
        <input
          style={styles.input}
          placeholder="Enter your name"
          value={visitorName}
          onChange={(e) => setVisitorName(e.target.value)}
          onKeyPress={(e) => { if (e.key === "Enter" && visitorName.trim()) setStep("issue"); }}
          autoFocus
        />
        <button
          style={{ ...styles.button, marginTop: "14px", opacity: visitorName.trim() ? 1 : 0.5 }}
          disabled={!visitorName.trim()}
          onClick={() => setStep("issue")}
        >
          Continue
        </button>
      </div>
    );
  }

  if (step === "issue") {
    return (
      <div style={{ padding: isMobile ? "24px 20px" : "20px", flex: 1, display: "flex", flexDirection: "column", ...styles.container }}>
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>How can we help?</h3>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)" }}>Choose what best describes your issue.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, overflowY: "auto", paddingBottom: "8px" }}>
          {issueOptions.map((issue) => (
            <button
              key={issue.id}
              onClick={() => startChat(issue.id)}
              disabled={isLoading}
              style={styles.issueButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
              }}
            >
              <span style={{ fontWeight: 500, display: "block", fontSize: "14px" }}>{issue.label}</span>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{issue.description}</span>
            </button>
          ))}
        </div>
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "14px" }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#6366f1" }} />
          </div>
        )}
      </div>
    );
  }

  // Chat step
  return (
    <div style={{ display: "flex", flexDirection: "column", height: isMobile ? "100%" : "380px", ...styles.container }}>
      {/* Chat Header */}
      <div style={{ 
        padding: "10px 14px", 
        borderBottom: "1px solid rgba(255,255,255,0.06)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between" 
      }}>
        <button
          onClick={handleNewChat}
          style={{ 
            fontSize: "13px", 
            color: "rgba(255,255,255,0.5)", 
            background: "none", 
            border: "none", 
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            borderRadius: "4px",
            transition: "background 0.15s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "none"}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          New Chat
        </button>
        <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
          {visitorName}
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {messages.map((msg) => (
          <div key={msg.id} style={msg.sender_type === "visitor" ? styles.visitorMessage : styles.staffMessage}>
            <p style={{ fontSize: "14px", margin: 0, lineHeight: 1.5 }}>{msg.content}</p>
            <span style={{ fontSize: "11px", opacity: 0.6, marginTop: "4px", display: "block" }}>
              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
        {staffTyping && <TypingIndicator label="Agent is typing" />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: isMobile ? "16px" : "12px 14px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="Type a message..."
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
          />
          <button
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "8px",
              background: newMessage.trim() ? "#6366f1" : "rgba(255,255,255,0.08)",
              border: "none",
              cursor: newMessage.trim() ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s",
              flexShrink: 0,
            }}
            onClick={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Send className="h-4 w-4" style={{ color: "#fff" }} />
          </button>
        </div>
      </div>
    </div>
  );
}