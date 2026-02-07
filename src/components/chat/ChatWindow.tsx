import { useState, useEffect, useRef } from "react";
import { Send, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { userSupabase as supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

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
  departmentId: string;
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

export function ChatWindow() {
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

  // Issue options mapped to departments
  const issueOptions: IssueOption[] = [
    {
      id: "general",
      label: "💬 General Question",
      description: "I have a question about your services",
      departmentId: "", // Will be filled with Customer Support ID
    },
    {
      id: "billing",
      label: "💳 Billing & Payments",
      description: "Issues with payments, refunds, or invoices",
      departmentId: "", // Client Relations
    },
    {
      id: "technical",
      label: "🔧 Technical Support",
      description: "Something isn't working correctly",
      departmentId: "", // Customer Support
    },
    {
      id: "appeal",
      label: "⚖️ Appeal a Decision",
      description: "Contest a ban or account action",
      departmentId: "", // Appeals Team
    },
    {
      id: "legal",
      label: "📋 Legal & Compliance",
      description: "GDPR, data requests, legal matters",
      departmentId: "", // Legal & Compliance
    },
    {
      id: "partnership",
      label: "🤝 Partnership Inquiry",
      description: "Business partnerships or collaborations",
      departmentId: "", // Client Relations
    },
  ];

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

  // Fetch messages when restoring a session
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

      // Send welcome message
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
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "welcome") {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-semibold">Welcome to Zenex Support</h3>
          <p className="text-sm text-muted-foreground">
            We're here to help! Start a conversation with our team.
          </p>
        </div>
        <Button
          className="w-full gradient-bg text-primary-foreground"
          onClick={() => setStep("name")}
        >
          Start Chat
        </Button>
      </div>
    );
  }

  if (step === "name") {
    return (
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">What's your name?</h3>
          <p className="text-sm text-muted-foreground">
            So our team knows who they're talking to.
          </p>
        </div>
        <Input
          placeholder="Enter your name"
          value={visitorName}
          onChange={(e) => setVisitorName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && visitorName.trim()) {
              setStep("issue");
            }
          }}
        />
        <Button
          className="w-full gradient-bg text-primary-foreground"
          disabled={!visitorName.trim()}
          onClick={() => setStep("issue")}
        >
          Continue
        </Button>
      </div>
    );
  }

  if (step === "issue") {
    return (
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">How can we help you?</h3>
          <p className="text-sm text-muted-foreground">
            Choose the option that best describes your issue.
          </p>
        </div>
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {issueOptions.map((issue) => (
            <button
              key={issue.id}
              onClick={() => startChat(issue.id)}
              disabled={isLoading}
              className="w-full p-3 text-left rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-all group"
            >
              <span className="font-medium block">{issue.label}</span>
              <span className="text-xs text-muted-foreground">{issue.description}</span>
            </button>
          ))}
        </div>
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px]">
      {/* Chat Header */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <button
          onClick={handleNewChat}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          New Chat
        </button>
        <span className="text-xs text-muted-foreground">
          Chat with {visitorName}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[80%] p-3 rounded-2xl animate-fade-in",
              msg.sender_type === "visitor"
                ? "ml-auto gradient-bg text-primary-foreground rounded-br-sm"
                : "bg-muted text-foreground rounded-bl-sm"
            )}
          >
            <p className="text-sm">{msg.content}</p>
            <span className="text-[10px] opacity-70 mt-1 block">
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
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            size="icon"
            className="gradient-bg"
            onClick={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Send className="h-4 w-4 text-primary-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}
