import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Ticket {
  id: string;
  visitor_name: string;
  status: string;
  department_id: string;
  created_at: string;
  updated_at: string;
  department?: { name: string };
  unread_count?: number;
}

interface TicketListProps {
  selectedTicketId: string | null;
  onSelectTicket: (id: string) => void;
}

export function TicketList({ selectedTicketId, onSelectTicket }: TicketListProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchTickets = async () => {
    let query = supabase
      .from("tickets")
      .select(`
        *,
        department:departments(name)
      `)
      .order("updated_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter as "open" | "in_progress" | "waiting" | "resolved" | "closed");
    }

    const { data } = await query;
    if (data) setTickets(data as Ticket[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel("tickets-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        () => fetchTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in_progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "waiting":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "resolved":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "closed":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="w-80 border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <h2 className="font-semibold">Tickets</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No tickets found
          </div>
        ) : (
          tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => onSelectTicket(ticket.id)}
              className={cn(
                "w-full p-4 text-left border-b border-border hover:bg-muted/50 transition-colors",
                selectedTicketId === ticket.id && "bg-muted"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm truncate">
                    {ticket.visitor_name}
                  </span>
                </div>
                <Badge variant="outline" className={getStatusColor(ticket.status)}>
                  {ticket.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{ticket.department?.name}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
