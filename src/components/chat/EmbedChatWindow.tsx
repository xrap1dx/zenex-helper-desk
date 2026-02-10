import { useState, useEffect, useRef } from "react";
import { Send, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  {
    id: "general",
    label: "💬 General Question",
    description: "I have a question about your services",
  },
  {
    id: "billing",
    label: "💳 Billing & Payments",
    description: "Issues with payments, refunds, or invoices",
  },
  {
    id: "technical",
    label: "🔧 Technical Support",
    description: "Something isn't working correctly",
  },
  {
    id: "appeal",
    label: "⚖️ Appeal a Decision",
    description: "Contest a ban or account action",
  },
  {
    id: "legal",
    label: "📋 Legal & Compliance",
    description: "GDPR, data requests, legal matters",
  },
  {
    id: "partnership",
    label: "🤝 Partnership Inquiry",
    description: "Business partnerships or collaborations",
  },
];

// Inline styles for the embed (no Tailwind dependencies)
const styles = {
  container: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif",
    color: "#fff",
    background: "#0a0d1f",
  },
  button: {
    background: "linear-gradient(135deg, rgba(0, 217, 255, 0.8), rgba(120, 70, 255, 0.8))",
    border: "none",
    borderRadius: "12px",
    padding: "12px 24px",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    fontSize: "14px",
    transition: "all 0.2s",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
  },
  issueButton: {
    width: "100%",
    padding: "12px 16px",
    textAlign: "left" as const,
    background: "rgba(255, 255, 255, 0.02)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
    color: "#fff",
  },
  visitorMessage: {
    maxWidth: "80%",
    padding: "12px 16px",
    borderRadius: "16px 16px 4px 16px",
    marginLeft: "auto",
    background: "linear-gradient(135deg, rgba(0, 217, 255, 0.8), rgba(120, 70, 255, 0.8))",
    color: "#fff",
  },
  staffMessage: {
    maxWidth: "80%",
    padding: "12px 16px",
    borderRadius: "16px 16px 16px 4px",
    background: "rgba(255, 255, 255, 0.08)",
    color: "#fff",
  },
};

export function EmbedChatWindow() {
  const [step, setStep] = useState<ChatStep>("welcome");
  const [visitorName, setVisitorName] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef<string>(crypto.randomUUID());
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore session from localStorage
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

  // Save session to localStorage
  useEffect(() => {
    if (!isRestoring) {
      const session: ChatSession = {
        step,
        visitorName,
        ticketId,
        sessionId: sessionId.current,
        selectedIssue,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [step, visitorName, ticketId, selectedIssue, isRestoring]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (ticketId && !isRestoring) {
      fetchMessages();
    }
  }, [ticketId, isRestoring]);

  useEffect(() => {
    if (ticketId) {
      const channel = supabase
        .channel(`messages:${ticketId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `ticket_id=eq.${ticketId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("*");
    if (data) setDepartments(data);
  };

  const fetchMessages = async () => {
    if (!ticketId) return;
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (msgs) setMessages(msgs as Message[]);
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
        content: `Hi ${visitorName}! 👋 Welcome to Zenex Support. You've reached us about "${subject}". A team member will be with you shortly. In the meantime, feel free to describe your issue in detail.`,
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

  const sendMessage = async () => {
    if (!newMessage.trim() || !ticketId) return;

    const content = newMessage.trim();
    setNewMessage("");

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
    sessionId.current = crypto.randomUUID();
    setStep("welcome");
    setVisitorName("");
    setTicketId(null);
    setMessages([]);
    setSelectedIssue(null);
  };

  if (isRestoring) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "400px", ...styles.container }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#00d9ff" }} />
      </div>
    );
  }

  if (step === "welcome") {
    return (
      <div style={{ padding: "24px", ...styles.container }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, rgba(0, 217, 255, 0.8), rgba(120, 70, 255, 0.8))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "28px"
          }}>
            💬
          </div>
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>Welcome to Zenex Support</h3>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
            We're here to help! Start a conversation with our team.
          </p>
        </div>
        <button style={styles.button} onClick={() => setStep("name")}>
          Start Chat
        </button>
      </div>
    );
  }

  if (step === "name") {
    return (
      <div style={{ padding: "24px", ...styles.container }}>
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>What's your name?</h3>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
            So our team knows who they're talking to.
          </p>
        </div>
        <input
          style={styles.input}
          placeholder="Enter your name"
          value={visitorName}
          onChange={(e) => setVisitorName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && visitorName.trim()) {
              setStep("issue");
            }
          }}
        />
        <button
          style={{ ...styles.button, marginTop: "16px", opacity: visitorName.trim() ? 1 : 0.5 }}
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
      <div style={{ padding: "24px", ...styles.container }}>
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>How can we help you?</h3>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
            Choose the option that best describes your issue.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
          {issueOptions.map((issue) => (
            <button
              key={issue.id}
              onClick={() => startChat(issue.id)}
              disabled={isLoading}
              style={styles.issueButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(0, 217, 255, 0.5)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
              }}
            >
              <span style={{ fontWeight: 500, display: "block" }}>{issue.label}</span>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{issue.description}</span>
            </button>
          ))}
        </div>
        {isLoading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#00d9ff" }} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "400px", ...styles.container }}>
      {/* Chat Header */}
      <div style={{ 
        padding: "8px 16px", 
        borderBottom: "1px solid rgba(255,255,255,0.1)", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "space-between" 
      }}>
        <button
          onClick={handleNewChat}
          style={{ 
            fontSize: "12px", 
            color: "rgba(255,255,255,0.6)", 
            background: "none", 
            border: "none", 
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          <ArrowLeft className="h-3 w-3" />
          New Chat
        </button>
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>
          Chat with {visitorName}
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={msg.sender_type === "visitor" ? styles.visitorMessage : styles.staffMessage}
          >
            <p style={{ fontSize: "14px", margin: 0 }}>{msg.content}</p>
            <span style={{ fontSize: "10px", opacity: 0.7, marginTop: "4px", display: "block" }}>
              {new Date(msg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            style={{ ...styles.input, flex: 1 }}
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: newMessage.trim() 
                ? "linear-gradient(135deg, rgba(0, 217, 255, 0.8), rgba(120, 70, 255, 0.8))"
                : "rgba(255,255,255,0.1)",
              border: "none",
              cursor: newMessage.trim() ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
