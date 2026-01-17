import { useState, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
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
}

type ChatStep = "welcome" | "name" | "department" | "chat";

export function ChatWindow() {
  const [step, setStep] = useState<ChatStep>("welcome");
  const [visitorName, setVisitorName] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(crypto.randomUUID());

  useEffect(() => {
    fetchDepartments();
  }, []);

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

  const startChat = async (dept: Department) => {
    setSelectedDepartment(dept);
    setIsLoading(true);

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        visitor_name: visitorName,
        department_id: dept.id,
        session_id: sessionId.current,
        status: "open",
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
        content: `Hi ${visitorName}! Welcome to Zenex Support. A team member from ${dept.name} will be with you shortly. How can we help you today?`,
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

  if (step === "welcome") {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center space-y-2">
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
              setStep("department");
            }
          }}
        />
        <Button
          className="w-full gradient-bg text-primary-foreground"
          disabled={!visitorName.trim()}
          onClick={() => setStep("department")}
        >
          Continue
        </Button>
      </div>
    );
  }

  if (step === "department") {
    return (
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">How can we help?</h3>
          <p className="text-sm text-muted-foreground">
            Choose a department to connect with.
          </p>
        </div>
        <div className="space-y-2">
          {departments.map((dept) => (
            <button
              key={dept.id}
              onClick={() => startChat(dept)}
              disabled={isLoading}
              className="w-full p-3 text-left rounded-lg border border-border hover:border-primary hover:bg-muted/50 transition-all"
            >
              <span className="font-medium">{dept.name}</span>
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
