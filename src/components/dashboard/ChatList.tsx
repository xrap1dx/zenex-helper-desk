import { useEffect, useState } from "react";
import { userSupabase as supabase } from "@/lib/supabaseClient";
import { useStaff } from "@/contexts/StaffContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Filter, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChatSession } from "@/lib/types";
import { getDepartmentName } from "@/lib/departments";

interface ChatListProps {
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
}

export function ChatList({ selectedChatId, onSelectChat }: ChatListProps) {
  const { staff } = useStaff();
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchChats = async () => {
    if (!staff) return;

    let query = supabase
      .from("chat_sessions")
      .select("*")
      .order("updated_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    let filtered = (data || []) as ChatSession[];

    // Agents see their department chats + all closed chats
    // Admins see everything
    if (staff.role !== "admin") {
      filtered = filtered.filter(
        (c) => c.status === "closed" || staff.departments.includes(c.department)
      );
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.visitor_name?.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q)
      );
    }

    setChats(filtered);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchChats();
    const channel = supabase
      .channel("chats-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        () => fetchChats()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter, search, staff?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "closed":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="w-full md:w-64 lg:w-72 border-r border-border flex flex-col bg-card/50 shrink-0 overflow-hidden">
      <div className="p-3 border-b border-border space-y-2 shrink-0">
        <h2 className="font-semibold text-sm">Chats</h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs pl-7"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full h-8 text-xs">
            <Filter className="h-3 w-3 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Chats</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="p-3 text-center text-muted-foreground text-sm">Loading...</div>
        ) : chats.length === 0 ? (
          <div className="p-3 text-center text-muted-foreground text-sm">No chats</div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={cn(
                "w-full p-3 text-left border-b border-border hover:bg-muted/50 transition-colors",
                selectedChatId === chat.id && "bg-muted"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-medium text-xs truncate">
                    {chat.visitor_name || "Visitor"}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0", getStatusColor(chat.status))}
                >
                  {chat.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="truncate">{getDepartmentName(chat.department)}</span>
                <span className="flex items-center gap-1 shrink-0">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDistanceToNow(new Date(chat.updated_at), { addSuffix: true })}
                </span>
              </div>
              {chat.messages?.length > 0 && (
                <p className="text-[10px] text-muted-foreground truncate mt-1">
                  {chat.messages[chat.messages.length - 1]?.content}
                </p>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
