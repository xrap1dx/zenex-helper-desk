import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Send,
  ArrowRight,
  CheckCircle,
  XCircle,
  User,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { listManagers } from "@/lib/auth";

interface Message {
  id: string;
  content: string;
  sender_type: "visitor" | "staff";
  sender_id: string | null;
  created_at: string;
  staff?: { display_name: string } | null;
}

interface Ticket {
  id: string;
  visitor_name: string;
  status: string;
  department_id: string;
  assigned_to: string | null;
  referred_to: string | null;
  department?: { name: string };
  visitor_typing?: boolean;
}

interface Department {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  display_name: string;
  is_online: boolean;
}

interface TicketChatProps {
  ticketId: string | null;
}

export function TicketChat({ ticketId }: TicketChatProps) {
  const { staff } = useStaff();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
      fetchMessages();
      fetchDepartments();
      fetchManagers();

      const channel = supabase
        .channel(`ticket-chat:${ticketId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `ticket_id=eq.${ticketId}`,
          },
          () => fetchMessages()
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "tickets",
            filter: `id=eq.${ticketId}`,
          },
          (payload: { new: { visitor_typing?: boolean } }) => {
            if (payload.new.visitor_typing !== undefined) {
              setVisitorTyping(payload.new.visitor_typing);
            }
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
  }, [messages, visitorTyping]);

  const fetchTicket = async () => {
    if (!ticketId) return;
    const { data } = await supabase
      .from("tickets")
      .select(`*, department:departments(name)`)
      .eq("id", ticketId)
      .single();
    if (data) setTicket(data as Ticket);
  };

  const fetchMessages = async () => {
    if (!ticketId) return;
    const { data } = await supabase
      .from("messages")
      .select(`*, staff:staff_public(display_name)`)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("*");
    if (data) setDepartments(data);
  };

  const fetchManagers = async () => {
    const { managers: mgrs } = await listManagers();
    setManagers(mgrs);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !ticketId || !staff) return;

    setIsLoading(true);
    await supabase.from("messages").insert({
      ticket_id: ticketId,
      sender_type: "staff",
      sender_id: staff.id,
      content: newMessage.trim(),
    });

    // Update ticket status if needed
    if (ticket?.status === "open") {
      await supabase
        .from("tickets")
        .update({ status: "in_progress", assigned_to: staff.id })
        .eq("id", ticketId);
      fetchTicket();
    }

    setNewMessage("");
    setIsLoading(false);
  };

  const updateTicketStatus = async (status: "open" | "in_progress" | "waiting" | "resolved" | "closed") => {
    if (!ticketId) return;
    await supabase
      .from("tickets")
      .update({
        status,
        closed_at: status === "closed" ? new Date().toISOString() : null,
      })
      .eq("id", ticketId);
    fetchTicket();
  };

  const transferTicket = async (target: string) => {
    if (!ticketId) return;
    
    // Check if it's a manager ID or department ID
    const isManager = managers.some(m => m.id === target);
    
    if (isManager) {
      // Refer to manager
      await supabase
        .from("tickets")
        .update({ referred_to: target, assigned_to: target })
        .eq("id", ticketId);
    } else {
      // Transfer to department
      await supabase
        .from("tickets")
        .update({ department_id: target, assigned_to: null, referred_to: null })
        .eq("id", ticketId);
    }
    fetchTicket();
  };

  // Update staff typing status
  const updateStaffTyping = useCallback(async (isTyping: boolean) => {
    if (!ticketId) return;
    await supabase.from("tickets").update({ staff_typing: isTyping, typing_updated_at: new Date().toISOString() }).eq("id", ticketId);
  }, [ticketId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    updateStaffTyping(true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => updateStaffTyping(false), 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const handleSendMessage = () => {
    updateStaffTyping(false);
    sendMessage();
  };

  if (!ticketId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a ticket to view the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      {ticket && (
        <div className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">{ticket.visitor_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {ticket.department?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select onValueChange={transferTicket}>
                <SelectTrigger className="w-[200px]">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Transfer / Refer
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel className="flex items-center gap-2">
                      <ArrowRight className="h-3 w-3" />
                      Departments
                    </SelectLabel>
                    {departments
                      .filter((d) => d.id !== ticket.department_id)
                      .map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                  {managers.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2">
                        <UserCheck className="h-3 w-3" />
                        Managers
                      </SelectLabel>
                      {managers
                        .filter((m) => m.id !== staff?.id)
                        .map((mgr) => (
                          <SelectItem key={mgr.id} value={mgr.id}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${mgr.is_online ? "bg-green-500" : "bg-muted-foreground"}`} />
                              {mgr.display_name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateTicketStatus("resolved")}
                disabled={ticket.status === "resolved" || ticket.status === "closed"}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Resolve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateTicketStatus("closed")}
                disabled={ticket.status === "closed"}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[70%] animate-fade-in",
              msg.sender_type === "staff" ? "ml-auto" : ""
            )}
          >
            {msg.sender_type === "staff" && msg.staff && (
              <p className="text-xs text-muted-foreground mb-1 text-right">
                {msg.staff.display_name}
              </p>
            )}
            <div
              className={cn(
                "p-3 rounded-2xl",
                msg.sender_type === "staff"
                  ? "gradient-bg text-primary-foreground rounded-br-sm"
                  : "bg-card border border-border rounded-bl-sm"
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
          </div>
        ))}
        {visitorTyping && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm animate-fade-in">
            <div className="flex gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0s" }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
            <span>{ticket?.visitor_name} is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            placeholder="Type your reply..."
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={ticket?.status === "closed"}
          />
          <Button
            className="gradient-bg"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isLoading || ticket?.status === "closed"}
          >
            <Send className="h-4 w-4 text-primary-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}