import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStaff } from "@/contexts/StaffContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { TicketList } from "@/components/dashboard/TicketList";
import { TicketChat } from "@/components/dashboard/TicketChat";
import { AdminPanel } from "@/components/dashboard/AdminPanel";
import { AccountPanel } from "@/components/dashboard/AccountPanel";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { TicketManagementPanel } from "@/components/dashboard/TicketManagementPanel";
import { WelcomePanel } from "@/components/dashboard/WelcomePanel";
import { Loader2 } from "lucide-react";

export type DashboardView = "welcome" | "tickets" | "admin" | "account" | "stats" | "ticket-management" | "affiliates";

export default function Dashboard() {
  const { staff, isLoading } = useStaff();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<DashboardView>("welcome");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !staff) {
      navigate("/staff");
    }
  }, [staff, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!staff) return null;

  return (
    <div className="h-screen bg-background flex w-full overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} staffRole={staff.role} />
      <main className="flex-1 flex min-w-0 overflow-hidden">
        {currentView === "welcome" && <WelcomePanel />}
        {currentView === "tickets" && (
          <>
            <TicketList selectedTicketId={selectedTicketId} onSelectTicket={setSelectedTicketId} />
            <TicketChat ticketId={selectedTicketId} onTicketDeleted={() => setSelectedTicketId(null)} />
          </>
        )}
        {currentView === "account" && <AccountPanel />}
        {currentView === "stats" && <StatsPanel />}
        {currentView === "ticket-management" && staff.role === "admin" && <TicketManagementPanel />}
        {currentView === "admin" && staff.role === "admin" && <AdminPanel />}
        {currentView === "affiliates" && <div className="flex-1 p-6"><h1 className="text-2xl font-bold">Affiliate Program</h1><p className="text-muted-foreground text-sm mt-1">Coming soon — backend tables are ready.</p></div>}
      </main>
    </div>
  );
}
