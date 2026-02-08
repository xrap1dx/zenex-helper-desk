import { useEffect, useState, useRef } from "react";
import { userSupabase as supabase } from "@/lib/supabaseClient";
import { useStaff } from "@/contexts/StaffContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Send,
  User,
  MessageSquare,
  StickyNote,
  ArrowRight,
  CheckCircle,
  Trash2,
  Star,
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
import type { ChatSession, ChatMessage, InternalNote } from "@/lib/types";
import { DEPARTMENTS, getDepartmentName } from "@/lib/departments";

interface ChatViewProps {
  chatId: string | null;
  onChatDeleted?: () => void;
}

export function ChatView({ chatId, onChatDeleted }: ChatViewProps) {
  const { staff } = useStaff();
  const [chat, setChat] = useState<ChatSession | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChat = async () => {
    if (!chatId) return;
    const { data } = await supabase.from("chat_sessions").select("*").eq("id", chatId).single();
    if (data) setChat(data as ChatSession);
  };

  useEffect(() => {
    if (chatId) {
      fetchChat();
      const channel = supabase
        .channel(`chat:${chatId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "chat_sessions",
            filter: `id=eq.${chatId}`,
          },
          (payload) => {
            setChat(payload.new as ChatSession);
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId || !staff || !chat) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      content: newMessage.trim(),
      sender_type: "staff",
      sender_name: staff.full_name,
      timestamp: new Date().toISOString(),
    };

    const messages = [...(chat.messages || []), msg];
    const updates: Record<string, unknown> = { messages, updated_at: new Date().toISOString() };

    if (chat.status === "waiting") {
      updates.status = "active";
      updates.assigned_to = staff.id;
    }

    await supabase.from("chat_sessions").update(updates).eq("id", chatId);
    setNewMessage("");
  };

  const addNote = async () => {
    if (!newNote.trim() || !chatId || !staff || !chat) return;

    const note: InternalNote = {
      id: crypto.randomUUID(),
      content: newNote.trim(),
      author: staff.full_name,
      timestamp: new Date().toISOString(),
    };

    const notes = [...(chat.internal_notes || []), note];
    await supabase.from("chat_sessions").update({ internal_notes: notes }).eq("id", chatId);
    setNewNote("");
    setIsNotesOpen(false);
  };

  const closeChat = async () => {
    if (!chatId) return;
    await supabase
      .from("chat_sessions")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", chatId);
  };

  const transferChat = async (dept: string) => {
    if (!chatId || !staff || !chat) return;
    const history = [
      ...(chat.transfer_history || []),
      {
        from_department: chat.department,
        to_department: dept,
        transferred_by: staff.full_name,
        timestamp: new Date().toISOString(),
      },
    ];
    await supabase
      .from("chat_sessions")
      .update({
        department: dept,
        assigned_to: null,
        transfer_history: history,
        updated_at: new Date().toISOString(),
      })
      .eq("id", chatId);
  };

  const deleteChat = async () => {
    if (!chatId) return;
    await supabase.from("chat_sessions").delete().eq("id", chatId);
    onChatDeleted?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a chat to view the conversation</p>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="p-2 md:p-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-sm truncate">{chat.visitor_name || "Visitor"}</h3>
              <p className="text-[10px] text-muted-foreground truncate">
                {getDepartmentName(chat.department)}
              </p>
            </div>
            {chat.rating != null && (
              <div className="flex items-center gap-1 text-yellow-400">
                <Star className="h-3 w-3 fill-current" />
                <span className="text-xs">{chat.rating}/5</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                  <StickyNote className="h-3 w-3" /> Notes
                  {chat.internal_notes?.length ? ` (${chat.internal_notes.length})` : ""}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Internal Notes</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                  {(!chat.internal_notes || chat.internal_notes.length === 0) ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
                  ) : (
                    chat.internal_notes.map((note) => (
                      <div key={note.id} className="p-2 rounded-md bg-muted/50 text-xs">
                        <span className="font-medium">{note.author}</span> — {note.content}
                        <span className="block text-[10px] text-muted-foreground mt-1">
                          {new Date(note.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <Textarea
                    placeholder="Add internal note..."
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

            <Select onValueChange={transferChat}>
              <SelectTrigger className="h-7 w-auto text-xs px-2 border-0 bg-transparent hover:bg-accent gap-1 [&>svg:last-child]:hidden">
                <ArrowRight className="h-3 w-3" /> Transfer
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.filter((d) => d.id !== chat.department).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={closeChat}
              disabled={chat.status === "closed"}
            >
              <CheckCircle className="h-3 w-3" /> Close
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:text-destructive gap-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                  <AlertDialogDescription>
                    Permanently delete this chat and all messages?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={deleteChat}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/10 min-h-0">
        {(chat.messages || []).map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[75%] animate-fade-in",
              msg.sender_type === "staff" ? "ml-auto" : ""
            )}
          >
            {msg.sender_type === "staff" && (
              <p className="text-[10px] text-muted-foreground mb-0.5 text-right">
                {msg.sender_name}
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
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-2 md:p-3 border-t border-border bg-card shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder="Type your reply..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-9 text-sm"
            disabled={chat.status === "closed"}
          />
          <Button
            size="sm"
            className="h-9 px-3"
            onClick={sendMessage}
            disabled={!newMessage.trim() || chat.status === "closed"}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
