import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { Trash2, Loader2, Archive } from "lucide-react";

export function TicketManagementPanel() {
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);
  const [isClearingClosed, setIsClearingClosed] = useState(false);

  const clearAllTickets = async () => {
    setIsClearing(true);
    try {
      await supabase.from("messages").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("ticket_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("tickets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      toast({ title: "Success", description: "All tickets have been cleared." });
    } catch {
      toast({ title: "Error", description: "Failed to clear tickets.", variant: "destructive" });
    }
    setIsClearing(false);
  };

  const clearClosedTickets = async () => {
    setIsClearingClosed(true);
    try {
      const { data: closedTickets } = await supabase.from("tickets").select("id").in("status", ["closed", "resolved"]);
      if (closedTickets && closedTickets.length > 0) {
        const ids = closedTickets.map(t => t.id);
        await supabase.from("messages").delete().in("ticket_id", ids);
        await supabase.from("ticket_notes").delete().in("ticket_id", ids);
        await supabase.from("tickets").delete().in("id", ids);
        toast({ title: "Success", description: `Cleared ${closedTickets.length} closed/resolved tickets.` });
      } else {
        toast({ title: "Info", description: "No closed or resolved tickets to clear." });
      }
    } catch {
      toast({ title: "Error", description: "Failed to clear tickets.", variant: "destructive" });
    }
    setIsClearingClosed(false);
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ticket Management</h1>
          <p className="text-muted-foreground text-sm">Administrative actions for ticket management.</p>
        </div>

        {/* Clear Closed Tickets */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Archive className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">Clear Closed Tickets</h2>
              <p className="text-xs text-muted-foreground">Remove all resolved and closed tickets and their messages.</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isClearingClosed}>
                {isClearingClosed ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                Clear Closed & Resolved
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Closed Tickets</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all closed and resolved tickets along with their messages. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="hover:bg-accent">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearClosedTickets} className="bg-destructive hover:bg-destructive/90">
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Clear All Tickets */}
        <div className="rounded-xl border border-destructive/30 bg-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Trash2 className="h-5 w-5 text-destructive" />
            <div>
              <h2 className="font-semibold text-destructive">Clear All Tickets</h2>
              <p className="text-xs text-muted-foreground">Permanently delete every ticket, message, and note. Use with extreme caution.</p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isClearing}>
                {isClearing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Clear All Tickets
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear ALL Tickets</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete ALL tickets, messages, and notes. This action is irreversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="hover:bg-accent">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearAllTickets} className="bg-destructive hover:bg-destructive/90">
                  Delete Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
