import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Ticket, Users, Building2, Clock, CheckCircle, XCircle, AlertCircle, Link2, MousePointerClick, Trophy } from "lucide-react";

const AFFILIATE_DEPT_NAMES = ["Affiliate Program", "Affiliate Program Management"];

interface Stats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  waitingTickets: number;
  totalStaff: number;
  onlineStaff: number;
  departmentStats: { name: string; count: number }[];
  totalAffiliates: number;
  totalAffiliateCompanies: number;
  totalAffiliateClicks: number;
  topAffiliate: { name: string; clicks: number } | null;
}

export function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);

    const [ticketsRes, staffRes, deptsRes, affiliateCompaniesRes, affiliateMembersRes] = await Promise.all([
      supabase.from("tickets").select("status, department_id"),
      supabase.from("staff_public").select("is_online, last_seen, role"),
      supabase.from("departments").select("id, name"),
      supabase.from("affiliate_companies").select("id, name, clicks"),
      supabase.from("affiliate_members").select("id"),
    ]);

    const tickets = ticketsRes.data || [];
    const staffList = staffRes.data || [];
    const departments = deptsRes.data || [];
    const affiliateCompanies = affiliateCompaniesRes.data || [];
    const affiliateMembers = affiliateMembersRes.data || [];

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();

    // Filter out affiliate departments from ticket stats
    const affiliateDeptIds = departments
      .filter(d => AFFILIATE_DEPT_NAMES.includes(d.name))
      .map(d => d.id);

    const nonAffiliateDepts = departments.filter(d => !AFFILIATE_DEPT_NAMES.includes(d.name));

    const departmentStats = nonAffiliateDepts.map(dept => ({
      name: dept.name,
      count: tickets.filter(t => t.department_id === dept.id).length,
    })).sort((a, b) => b.count - a.count);

    // Non-affiliate staff for counts
    const nonAffiliateStaff = staffList.filter(s => s.role !== "affiliate");

    // Affiliate stats
    const totalAffiliateClicks = affiliateCompanies.reduce((sum, c) => sum + (c.clicks || 0), 0);
    const topAffiliate = affiliateCompanies.length > 0
      ? affiliateCompanies.reduce((top, c) => (c.clicks || 0) > (top.clicks || 0) ? c : top)
      : null;

    setStats({
      totalTickets: tickets.length,
      openTickets: tickets.filter(t => t.status === "open").length,
      inProgressTickets: tickets.filter(t => t.status === "in_progress").length,
      resolvedTickets: tickets.filter(t => t.status === "resolved").length,
      closedTickets: tickets.filter(t => t.status === "closed").length,
      waitingTickets: tickets.filter(t => t.status === "waiting").length,
      totalStaff: nonAffiliateStaff.length,
      onlineStaff: nonAffiliateStaff.filter(s => s.is_online && s.last_seen && s.last_seen >= oneMinuteAgo).length,
      departmentStats,
      totalAffiliates: affiliateMembers.length,
      totalAffiliateCompanies: affiliateCompanies.length,
      totalAffiliateClicks,
      topAffiliate: topAffiliate ? { name: topAffiliate.name, clicks: topAffiliate.clicks || 0 } : null,
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
    { label: "Total Tickets", value: stats.totalTickets, icon: Ticket, color: "text-primary" },
    { label: "Open", value: stats.openTickets, icon: AlertCircle, color: "text-yellow-400" },
    { label: "In Progress", value: stats.inProgressTickets, icon: Clock, color: "text-blue-400" },
    { label: "Resolved", value: stats.resolvedTickets, icon: CheckCircle, color: "text-green-400" },
    { label: "Closed", value: stats.closedTickets, icon: XCircle, color: "text-muted-foreground" },
    { label: "Waiting", value: stats.waitingTickets, icon: Clock, color: "text-orange-400" },
    { label: "Total Staff", value: stats.totalStaff, icon: Users, color: "text-primary" },
    { label: "Staff Online", value: stats.onlineStaff, icon: Users, color: "text-green-400" },
  ];

  const affiliateCards = [
    { label: "Affiliate Companies", value: stats.totalAffiliateCompanies, icon: Building2, color: "text-primary" },
    { label: "Total Affiliates", value: stats.totalAffiliates, icon: Link2, color: "text-blue-400" },
    { label: "Total Clicks", value: stats.totalAffiliateClicks, icon: MousePointerClick, color: "text-green-400" },
    { label: "Top Affiliate", value: stats.topAffiliate ? stats.topAffiliate.name : "—", subValue: stats.topAffiliate ? `${stats.topAffiliate.clicks} clicks` : "", icon: Trophy, color: "text-yellow-400" },
  ];

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Statistics</h1>
          <p className="text-muted-foreground text-sm">Overview of support system activity.</p>
        </div>

        {/* Ticket Stat Cards */}
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
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Tickets by Department</h2>
          </div>
          <div className="space-y-3">
            {stats.departmentStats.map((dept) => {
              const percentage = stats.totalTickets > 0 ? (dept.count / stats.totalTickets) * 100 : 0;
              return (
                <div key={dept.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{dept.name}</span>
                    <span className="text-muted-foreground">{dept.count} tickets ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Affiliate Stats */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Affiliate Program
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {affiliateCards.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                {"subValue" in stat && stat.subValue && (
                  <p className="text-xs text-muted-foreground">{stat.subValue}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
