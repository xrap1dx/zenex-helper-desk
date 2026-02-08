import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStaff } from "@/contexts/StaffContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ChatList } from "@/components/dashboard/ChatList";
import { ChatView } from "@/components/dashboard/ChatView";
import { UserManagement } from "@/components/dashboard/UserManagement";
import { AccountPanel } from "@/components/dashboard/AccountPanel";
import { StatsPanel } from "@/components/dashboard/StatsPanel";
import { WelcomePanel } from "@/components/dashboard/WelcomePanel";
import { Loader2 } from "lucide-react";

export type DashboardView = "welcome" | "chats" | "users" | "stats" | "account";

export default function Dashboard() {
  const { staff, isLoading } = useStaff();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<DashboardView>("welcome");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !staff) navigate("/staff");
  }, [staff, isLoading, navigate]);

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  if (!staff) return null;

  return (
    <div className="h-screen bg-background flex w-full overflow-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 flex min-w-0 overflow-hidden">
        {currentView === "welcome" && <WelcomePanel />}
        {currentView === "chats" && (
          <>
            <ChatList selectedChatId={selectedChatId} onSelectChat={setSelectedChatId} />
            <ChatView chatId={selectedChatId} onChatDeleted={() => setSelectedChatId(null)} />
          </>
        )}
        {currentView === "users" && staff.role === "admin" && <UserManagement />}
        {currentView === "stats" && staff.role === "admin" && <StatsPanel />}
        {currentView === "account" && <AccountPanel />}
      </main>
    </div>
  );
}
