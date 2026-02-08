import { useState, useEffect, useRef } from "react";
import { Send, Loader2, ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { userSupabase as supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatSession } from "@/lib/types";
import { DEPARTMENTS } from "@/lib/departments";

type ChatStep = "welcome" | "name" | "issue" | "chat" | "rating" | "done";

const STORAGE_KEY = "zenex_chat_session";

interface StoredSession {
  step: ChatStep;
  visitorName: string;
  chatId: string | null;
}

export function ChatWindow() {
  const [step, setStep] = useState<ChatStep>("welcome");
  const [visitorName, setVisitorName] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [isRestoring, setIsRestoring] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Restore session
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const session: StoredSession = JSON.parse(saved);
        if (session.chatId) {
          setStep(session.step === "rating" || session.step === "done" ? session.step : "chat");
          setVisitorName(session.visitorName);
          setChatId(session.chatId);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsRestoring(false);
  }, []);

  // Save session
  useEffect(() => {
    if (!isRestoring) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, visitorName, chatId }));
    }
  }, [step, visitorName, chatId, isRestoring]);

  // Fetch chat data + realtime
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
        .channel(`visitor-chat:${chatId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "chat_sessions", filter: `id=eq.${chatId}` },
          (payload) => {
            const updated = payload.new as ChatSession;
            setMessages(updated.messages || []);
            if (updated.status === "closed" && updated.rating == null && step === "chat")
              setStep("rating");
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
            id: crypto.randomUUID(),
            content: `Please explain your issue - an agent will be with you shortly.`,
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
      id: crypto.randomUUID(),
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
          <h3 className="text-lg font-semibold">Hi there! 👋 How can we help you today?</h3>
        </div>
        <Button className="w-full gradient-bg text-primary-foreground" onClick={() => setStep("name")}>
          Start Chat
        </Button>
      </div>
    );
  }

  if (step === "name") {
    return (
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Great! What's your name so we can assist you better?</h3>
          <p className="text-sm text-muted-foreground">Your Name</p>
        </div>
        <Input
          placeholder="Enter your name"
          value={visitorName}
          onChange={(e) => setVisitorName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && visitorName.trim()) setStep("issue");
          }}
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setStep("welcome")}>
            Back
          </Button>
          <Button
            className="flex-1 gradient-bg text-primary-foreground"
            disabled={!visitorName.trim()}
            onClick={() => setStep("issue")}
          >
            Start Chat
          </Button>
        </div>
      </div>
    );
  }

  if (step === "issue") {
    return (
      <div className="p-6 space-y-4">
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground font-medium tracking-wider">
            Select Inquiry
          </p>
        </div>
        <div className="space-y-2">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept.id}
              onClick={() => startChat(dept.id)}
              disabled={isLoading}
              className="w-full p-3 text-left rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-all"
            >
              <span className="font-medium">{dept.name}</span>
            </button>
          ))}
        </div>
        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>
    );
  }

  if (step === "rating") {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[400px] space-y-6">
        <h3 className="text-lg font-bold">Rate Your Experience</h3>
        <p className="text-sm text-muted-foreground">How was your support experience?</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-10 w-10",
                  n <= rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>
        <Button
          className="w-full gradient-bg text-primary-foreground"
          disabled={rating === 0}
          onClick={submitRating}
        >
          Submit Rating
        </Button>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[400px] space-y-4">
        <h3 className="text-lg font-bold">Thank you! 🎉</h3>
        <p className="text-sm text-muted-foreground">Your feedback helps us improve.</p>
        <Button variant="outline" onClick={handleNewChat}>
          Start New Chat
        </Button>
      </div>
    );
  }

  // Chat step
  return (
    <div className="flex flex-col h-[400px]">
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <button
          onClick={handleNewChat}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> New Chat
        </button>
        <span className="text-xs text-muted-foreground">{visitorName}</span>
      </div>

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
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            className="flex-1"
          />
          <Button size="icon" className="gradient-bg" onClick={sendMessage} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4 text-primary-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}
