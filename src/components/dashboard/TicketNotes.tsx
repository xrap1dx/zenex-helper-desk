import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StickyNote, ArrowRight, UserCheck, CheckCircle, XCircle, UserPlus } from "lucide-react";

interface TicketNote {
  id: string;
  ticket_id: string;
  staff_id: string | null;
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

interface TicketNotesProps {
  ticketId: string;
}

export function TicketNotes({ ticketId }: TicketNotesProps) {
  const { staff } = useStaff();
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (ticketId) {
      fetchNotes();

      const channel = supabase
        .channel(`ticket-notes:${ticketId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ticket_notes",
            filter: `ticket_id=eq.${ticketId}`,
          },
          () => fetchNotes()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [ticketId]);

  const fetchNotes = async () => {
    const { data } = await supabase
      .from("ticket_notes")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (data) setNotes(data as TicketNote[]);
  };

  const addNote = async () => {
    if (!newNote.trim() || !staff) return;

    setIsLoading(true);
    await supabase.from("ticket_notes").insert({
      ticket_id: ticketId,
      staff_id: staff.id,
      note_type: "note",
      content: newNote.trim(),
      metadata: { staff_name: staff.display_name },
    });

    setNewNote("");
    setIsLoading(false);
    setIsOpen(false);
  };

  const getNoteIcon = (type: string, metadata?: TicketNote["metadata"]) => {
    switch (type) {
      case "transfer":
        return <ArrowRight className="h-3 w-3" />;
      case "refer":
        return <UserCheck className="h-3 w-3" />;
      case "status_change":
        return metadata?.new_status === "closed" ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />;
      case "assigned":
        return <UserPlus className="h-3 w-3" />;
      default:
        return <StickyNote className="h-3 w-3" />;
    }
  };

  const getNoteText = (note: TicketNote) => {
    const staffName = note.metadata?.staff_name || "Staff";
    
    switch (note.note_type) {
      case "transfer":
        return `${staffName} transferred ticket to ${note.metadata?.target_department || "another department"}`;
      case "refer":
        return `${staffName} referred ticket to ${note.metadata?.target_staff || "a manager"}`;
      case "status_change":
        return `${staffName} changed status from ${note.metadata?.old_status || "unknown"} to ${note.metadata?.new_status || "unknown"}`;
      case "assigned":
        return `${staffName} was assigned to this ticket`;
      default:
        return note.content;
    }
  };

  if (notes.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <StickyNote className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Internal Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Add a note visible only to staff..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={4}
            />
            <Button onClick={addNote} disabled={!newNote.trim() || isLoading} className="w-full">
              Add Note
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Internal Notes</span>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <StickyNote className="h-3 w-3 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Internal Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Add a note visible only to staff..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={4}
              />
              <Button onClick={addNote} disabled={!newNote.trim() || isLoading} className="w-full">
                Add Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {notes.map((note) => (
          <div
            key={note.id}
            className="flex items-start gap-2 px-2 py-1.5 bg-muted/50 rounded text-xs"
          >
            <span className="text-muted-foreground mt-0.5">{getNoteIcon(note.note_type, note.metadata)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Internal</span> — {getNoteText(note)}
              </p>
              <span className="text-[10px] text-muted-foreground">
                {new Date(note.created_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}