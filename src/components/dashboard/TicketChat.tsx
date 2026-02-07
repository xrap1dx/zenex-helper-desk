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
  StickyNote,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { listManagers } from "@/lib/auth";

interface Message {
  id: string;
  content: string;
  sender_type: "visitor" | "staff";
  sender_id: string | null;
  created_at: string;
  staff?: { display_name: string } | null;
}

interface TicketNote {
  id: string;
  note_type: string;
  content: string;
  metadata: {
    target_department?: string;
    target_staff?: string;
    old_status?: string;
    new_status?: string;
    staff_name?: string;
  } | null;
  created_at: string;
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
  onTicketDeleted?: () => void;
}

// Merged type for timeline view
type TimelineItem = 
  | { type: "message"; data: Message; timestamp: string }
  | { type: "note"; data: TicketNote; timestamp: string };

export function TicketChat({ ticketId, onTicketDeleted }: TicketChatProps) {
  const { staff } = useStaff();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newNote, setNewNote] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
      fetchMessages();
      fetchNotes();
      fetchDepartments();
      fetchManagers();

      const channel = supabase
        .channel(`ticket-chat:${ticketId}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `ticket_id=eq.${ticketId}`,
        }, () => fetchMessages())
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "ticket_notes",
          filter: `ticket_id=eq.${ticketId}`,
        }, () => fetchNotes())
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `id=eq.${ticketId}`,
        }, (payload: { new: { visitor_typing?: boolean } }) => {
          if (payload.new.visitor_typing !== undefined) {
            setVisitorTyping(payload.new.visitor_typing);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, notes, visitorTyping]);

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

  const fetchNotes = async () => {
    if (!ticketId) return;
    const { data } = await supabase
      .from("ticket_notes")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (data) setNotes(data as TicketNote[]);
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

    if (ticket?.status === "open") {
      await supabase
        .from("tickets")
        .update({ status: "in_progress", assigned_to: staff.id })
        .eq("id", ticketId);
      
      await supabase.from("ticket_notes").insert({
        ticket_id: ticketId,
        staff_id: staff.id,
        note_type: "assigned",
        content: `${staff.display_name} was assigned to this ticket`,
        metadata: { staff_name: staff.display_name },
      });
      
      fetchTicket();
    }

    setNewMessage("");
    setIsLoading(false);
  };

  const addNote = async () => {
    if (!newNote.trim() || !ticketId || !staff) return;

    await supabase.from("ticket_notes").insert({
      ticket_id: ticketId,
      staff_id: staff.id,
      note_type: "note",
      content: newNote.trim(),
      metadata: { staff_name: staff.display_name },
    });

    setNewNote("");
    setIsNotesOpen(false);
  };

  const updateTicketStatus = async (status: "open" | "in_progress" | "waiting" | "resolved" | "closed") => {
    if (!ticketId || !staff) return;
    const oldStatus = ticket?.status;
    
    await supabase
      .from("tickets")
      .update({
        status,
        closed_at: status === "closed" ? new Date().toISOString() : null,
      })
      .eq("id", ticketId);
    
    await supabase.from("ticket_notes").insert({
      ticket_id: ticketId,
      staff_id: staff.id,
      note_type: "status_change",
      content: `Status changed from ${oldStatus} to ${status}`,
      metadata: { staff_name: staff.display_name, old_status: oldStatus, new_status: status },
    });
    
    fetchTicket();
  };

  const transferTicket = async (deptId: string) => {
    if (!ticketId || !staff) return;
    const targetDept = departments.find(d => d.id === deptId);
    
    await supabase
      .from("tickets")
      .update({ department_id: deptId, assigned_to: null, referred_to: null })
      .eq("id", ticketId);
    
    await supabase.from("ticket_notes").insert({
      ticket_id: ticketId,
      staff_id: staff.id,
      note_type: "transfer",
      content: `Transferred to ${targetDept?.name || "department"}`,
      metadata: { staff_name: staff.display_name, target_department: targetDept?.name },
    });
    
    fetchTicket();
  };

  const referToManager = async (managerId: string) => {
    if (!ticketId || !staff) return;
    const targetManager = managers.find(m => m.id === managerId);
    
    await supabase
      .from("tickets")
      .update({ referred_to: managerId, assigned_to: managerId })
      .eq("id", ticketId);
    
    await supabase.from("ticket_notes").insert({
      ticket_id: ticketId,
      staff_id: staff.id,
      note_type: "refer",
      content: `Referred to ${targetManager?.display_name || "manager"}`,
      metadata: { staff_name: staff.display_name, target_staff: targetManager?.display_name },
    });
    
    fetchTicket();
  };

  const deleteTicket = async () => {
    if (!ticketId) return;
    
    // Delete related data first
    await supabase.from("messages").delete().eq("ticket_id", ticketId);
    await supabase.from("ticket_notes").delete().eq("ticket_id", ticketId);
    await supabase.from("tickets").delete().eq("id", ticketId);
    
    onTicketDeleted?.();
  };

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

  // Merge messages and notes for timeline view
  const timelineItems: TimelineItem[] = [
    ...messages.map(m => ({ type: "message" as const, data: m, timestamp: m.created_at })),
    ...notes.map(n => ({ type: "note" as const, data: n, timestamp: n.created_at })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const getNoteText = (note: TicketNote) => {
    const staffName = note.metadata?.staff_name || "Staff";
    switch (note.note_type) {
      case "transfer":
        return `${staffName} transferred ticket to ${note.metadata?.target_department || "another department"}`;
      case "refer":
        return `${staffName} referred ticket to ${note.metadata?.target_staff || "a manager"}`;
      case "status_change":
        return `${staffName} changed status: ${note.metadata?.old_status} → ${note.metadata?.new_status}`;
      case "assigned":
        return `${staffName} was assigned to this ticket`;
      case "note":
        return `${staffName} — ${note.content}`;
      default:
        return `${staffName} — ${note.content}`;
    }
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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header - compact */}
      {ticket && (
        <div className="p-2 md:p-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Visitor info */}
            <div className="flex items-center gap-2 mr-auto">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-sm truncate">{ticket.visitor_name}</h3>
                <p className="text-[10px] text-muted-foreground truncate">{ticket.department?.name}</p>
              </div>
            </div>
            
            {/* Action buttons - compact row */}
            <div className="flex items-center gap-1 flex-wrap">
              {/* Notes */}
              <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                    <StickyNote className="h-3 w-3" />
                    Notes
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Internal Notes</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto space-y-2 max-h-[40vh]">
                    {notes.filter(n => n.note_type === "note").length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
                    ) : (
                      notes.filter(n => n.note_type === "note").map(note => (
                        <div key={note.id} className="p-2 rounded-md bg-muted/50 text-xs">
                          <span className="font-medium">{note.metadata?.staff_name || "Staff"}</span>
                          <span className="text-muted-foreground"> — {note.content}</span>
                          <span className="block text-[10px] text-muted-foreground mt-1">
                            {new Date(note.created_at).toLocaleString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Textarea
                      placeholder="Add a note visible only to staff..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                    <Button onClick={addNote} disabled={!newNote.trim()} size="sm" className="w-full">
                      Add Note
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Transfer */}
              <Select onValueChange={transferTicket}>
                <SelectTrigger className="h-7 w-auto text-xs px-2 border-0 bg-transparent hover:bg-accent gap-1 [&>svg:last-child]:hidden">
                  <ArrowRight className="h-3 w-3" />
                  Transfer
                </SelectTrigger>
                <SelectContent>
                  {departments
                    .filter((d) => d.id !== ticket.department_id)
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id} className="text-sm">
                        {dept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Refer to Manager */}
              {managers.length > 0 && (
                <Select onValueChange={referToManager}>
                  <SelectTrigger className="h-7 w-auto text-xs px-2 border-0 bg-transparent hover:bg-accent gap-1 [&>svg:last-child]:hidden">
                    <UserCheck className="h-3 w-3" />
                    Refer
                  </SelectTrigger>
                  <SelectContent>
                    {managers
                      .filter((m) => m.id !== staff?.id)
                      .map((mgr) => (
                        <SelectItem key={mgr.id} value={mgr.id} className="text-sm">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${mgr.is_online ? "bg-green-500" : "bg-muted-foreground"}`} />
                            {mgr.display_name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}

              {/* Resolve */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => updateTicketStatus("resolved")}
                disabled={ticket.status === "resolved" || ticket.status === "closed"}
              >
                <CheckCircle className="h-3 w-3" />
                Resolve
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => updateTicketStatus("closed")}
                disabled={ticket.status === "closed"}
              >
                <XCircle className="h-3 w-3" />
                Close
              </Button>

              {/* Delete */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive gap-0">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this ticket and all its messages. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="hover:bg-accent">Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteTicket} className="bg-destructive hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}

      {/* Messages + Notes Timeline */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/10 min-h-0">
        {timelineItems.map((item) => {
          if (item.type === "message") {
            const msg = item.data;
            return (
              <div
                key={`msg-${msg.id}`}
                className={cn(
                  "max-w-[75%] animate-fade-in",
                  msg.sender_type === "staff" ? "ml-auto" : ""
                )}
              >
                {msg.sender_type === "staff" && msg.staff && (
                  <p className="text-[10px] text-muted-foreground mb-0.5 text-right">
                    {msg.staff.display_name}
                  </p>
                )}
                <div
                  className={cn(
                    "p-2.5 rounded-xl text-sm",
                    msg.sender_type === "staff"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card border border-border rounded-bl-sm"
                  )}
                >
                  <p>{msg.content}</p>
                  <span className="text-[10px] opacity-60 mt-1 block">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          } else {
            const note = item.data;
            return (
              <div key={`note-${note.id}`} className="flex justify-center animate-fade-in">
                <div className="px-3 py-1.5 bg-muted/50 rounded-full text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3" />
                  <span>Internal — {getNoteText(note)}</span>
                </div>
              </div>
            );
          }
        })}
        
        {visitorTyping && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs animate-fade-in">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.3s" }} />
            </div>
            <span>{ticket?.visitor_name} is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 md:p-3 border-t border-border bg-card shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder="Type your reply..."
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="flex-1 h-9 text-sm"
            disabled={ticket?.status === "closed"}
          />
          <Button
            size="sm"
            className="h-9 px-3 bg-primary hover:bg-primary/90"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || isLoading || ticket?.status === "closed"}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
