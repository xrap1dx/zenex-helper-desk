import { useEffect, useState } from "react";
import { userSupabase as supabase } from "@/lib/supabaseClient";
import { listStaffMembers } from "@/lib/auth";
import { Loader2, MessageSquare, CheckCircle, Clock, TrendingUp, Star } from "lucide-react";
import type { ChatSession, Staff } from "@/lib/types";
import { getDepartmentName } from "@/lib/departments";

interface Stats {
  total: number;
  active: number;
  waiting: number;
  closed: number;
  todayCount: number;
  deptBreakdown: { name: string; count: number }[];
  topAgents: { name: string; chats: number; rating: number }[];
}

export function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);

    const [chatsRes, staffRes] = await Promise.all([
      supabase.from("chat_sessions").select("*"),
      listStaffMembers(),
    ]);

    const chats = (chatsRes.data || []) as ChatSession[];
    const staffList = staffRes.staff || [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Department breakdown
    const deptMap: Record<string, number> = {};
    chats.forEach((c) => {
      const name = getDepartmentName(c.department);
      deptMap[name] = (deptMap[name] || 0) + 1;
    });
    const deptBreakdown = Object.entries(deptMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Top agents
    const agentChats: Record<string, { name: string; chats: number; totalRating: number; ratedCount: number }> = {};
    chats.forEach((c) => {
      if (c.assigned_to) {
        const agent = staffList.find((s) => s.id === c.assigned_to);
        const name = agent?.full_name || "Unknown";
        if (!agentChats[c.assigned_to]) {
          agentChats[c.assigned_to] = { name, chats: 0, totalRating: 0, ratedCount: 0 };
        }
        agentChats[c.assigned_to].chats++;
        if (c.rating != null) {
          agentChats[c.assigned_to].totalRating += c.rating;
          agentChats[c.assigned_to].ratedCount++;
        }
      }
    });
    const topAgents = Object.values(agentChats)
      .map((a) => ({
        name: a.name,
        chats: a.chats,
        rating: a.ratedCount > 0 ? a.totalRating / a.ratedCount : 0,
      }))
      .sort((a, b) => b.chats - a.chats)
      .slice(0, 10);

    setStats({
      total: chats.length,
      active: chats.filter((c) => c.status === "active").length,
      waiting: chats.filter((c) => c.status === "waiting").length,
      closed: chats.filter((c) => c.status === "closed").length,
      todayCount: chats.filter((c) => new Date(c.created_at) >= today).length,
      deptBreakdown,
      topAgents,
    });

    setIsLoading(false);
  };

  if (isLoading || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Chats", value: stats.total, icon: MessageSquare, color: "text-primary" },
    { label: "Resolved", value: stats.closed, icon: CheckCircle, color: "text-green-400" },
    { label: "In Queue", value: stats.waiting, icon: Clock, color: "text-yellow-400" },
    { label: "Today", value: stats.todayCount, icon: TrendingUp, color: "text-purple-400" },
  ];

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Statistics</h1>
          <p className="text-muted-foreground text-sm">Monitor support performance and metrics</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Department Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold">By Department</h2>
          <div className="space-y-3">
            {stats.deptBreakdown.map((dept) => {
              const pct = stats.total > 0 ? (dept.count / stats.total) * 100 : 0;
              return (
                <div key={dept.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{dept.name}</span>
                    <span className="text-muted-foreground">
                      {dept.count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Agents */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold">Top Agents</h2>
          <div className="space-y-3">
            {stats.topAgents.map((agent, i) => (
              <div
                key={agent.name}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
              >
                <span className="text-xs text-muted-foreground w-6">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">
                    {agent.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{agent.name}</p>
                </div>
                {agent.rating > 0 && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="text-xs">{agent.rating.toFixed(1)}</span>
                  </div>
                )}
                <span className="text-sm font-medium">{agent.chats}</span>
                <span className="text-xs text-muted-foreground">chats</span>
              </div>
            ))}
            {stats.topAgents.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
