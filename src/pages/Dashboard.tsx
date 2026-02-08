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
import { Loader2 } from "lucide-react";

export type DashboardView = "tickets" | "admin" | "account" | "stats" | "ticket-management";

export default function Dashboard() {
  const { staff, isLoading } = useStaff();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<DashboardView>("tickets");
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

  if (!staff) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex w-full overflow-hidden">
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        staffRole={staff.role}
      />

      <main className="flex-1 flex min-w-0 overflow-hidden">
        {currentView === "tickets" && (
          <>
            <TicketList
              selectedTicketId={selectedTicketId}
              onSelectTicket={setSelectedTicketId}
            />
            <TicketChat 
              ticketId={selectedTicketId} 
              onTicketDeleted={() => setSelectedTicketId(null)}
            />
          </>
        )}

        {currentView === "account" && <AccountPanel />}
        {currentView === "stats" && <StatsPanel />}
        {currentView === "ticket-management" && staff.role === "admin" && <TicketManagementPanel />}
        {currentView === "admin" && staff.role === "admin" && <AdminPanel />}
      </main>
    </div>
  );
}
