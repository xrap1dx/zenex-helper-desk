import { useEffect, useState } from "react";
import { userSupabase as supabase } from "@/lib/supabaseClient";
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
      .select(`*, department:departments(name)`)
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
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => fetchTickets())
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
        return "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
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
    <div className="w-full md:w-64 lg:w-72 border-r border-border flex flex-col bg-card/50 shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2 shrink-0">
        <h2 className="font-semibold text-sm">Tickets</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full h-8 text-xs">
            <Filter className="h-3 w-3 mr-2" />
            <SelectValue placeholder="Filter" />
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
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="p-3 text-center text-muted-foreground text-sm">Loading...</div>
        ) : tickets.length === 0 ? (
          <div className="p-3 text-center text-muted-foreground text-sm">No tickets</div>
        ) : (
          tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => onSelectTicket(ticket.id)}
              className={cn(
                "w-full p-3 text-left border-b border-border hover:bg-muted/50 transition-colors",
                selectedTicketId === ticket.id && "bg-muted"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-medium text-xs truncate">{ticket.visitor_name}</span>
                </div>
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getStatusColor(ticket.status))}>
                  {ticket.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="truncate">{ticket.department?.name}</span>
                <span className="flex items-center gap-1 shrink-0">
                  <Clock className="h-2.5 w-2.5" />
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
