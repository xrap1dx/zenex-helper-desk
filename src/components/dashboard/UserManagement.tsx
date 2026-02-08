import { useEffect, useState } from "react";
import { userSupabase as supabase } from "@/lib/supabaseClient";
import { useStaff } from "@/contexts/StaffContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Loader2,
  Users,
  Shield,
  Ban,
  Search,
  MoreHorizontal,
  Star,
  MessageSquare,
} from "lucide-react";
import {
  createStaffMember,
  listStaffMembers,
  suspendStaffMember,
  unsuspendStaffMember,
  deleteStaffMember,
  updateStaffMember,
  resetStaffPassword,
} from "@/lib/auth";
import type { Staff, ChatSession } from "@/lib/types";
import { DEPARTMENTS, getDepartmentName } from "@/lib/departments";
import { useToast } from "@/hooks/use-toast";

export function UserManagement() {
  const { staff: currentStaff } = useStaff();
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Staff | null>(null);
  const [userChats, setUserChats] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Create form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<string>("agent");
  const [newDepts, setNewDepts] = useState<string[]>([]);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    const { staff } = await listStaffMembers();
    setStaffMembers(staff);
  };

  const openUserDetail = async (user: Staff) => {
    setSelectedUser(user);
    setIsDetailOpen(true);
    const { data } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("assigned_to", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setUserChats((data || []) as ChatSession[]);
  };

  const handleCreate = async () => {
    if (!newUsername || !newPassword || !newFullName || !currentStaff) {
      toast({ title: "Error", description: "Fill all required fields.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    const { error } = await createStaffMember(
      newUsername,
      newPassword,
      newFullName,
      newEmail,
      newRole,
      newDepts,
      currentStaff.id
    );
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "User created." });
      setIsDialogOpen(false);
      setNewUsername("");
      setNewPassword("");
      setNewFullName("");
      setNewEmail("");
      setNewRole("agent");
      setNewDepts([]);
      fetchStaff();
    }
    setIsLoading(false);
  };

  const handleSuspend = async (id: string) => {
    const { error } = await suspendStaffMember(id, "Suspended by admin");
    if (!error) {
      toast({ title: "User suspended" });
      fetchStaff();
    }
  };

  const handleUnsuspend = async (id: string) => {
    const { error } = await unsuspendStaffMember(id);
    if (!error) {
      toast({ title: "User unsuspended" });
      fetchStaff();
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentStaff) return;
    const { error } = await deleteStaffMember(id, currentStaff.id);
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "User deleted" });
      fetchStaff();
    }
  };

  const filtered = staffMembers.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAdmins = staffMembers.filter((s) => s.role === "admin").length;
  const totalActive = staffMembers.filter((s) => s.is_active && !s.is_suspended).length;
  const totalSuspended = staffMembers.filter((s) => s.is_suspended).length;

  // Rating calc for selected user
  const ratedChats = userChats.filter((c) => c.rating != null);
  const avgRating =
    ratedChats.length > 0
      ? ratedChats.reduce((sum, c) => sum + (c.rating || 0), 0) / ratedChats.length
      : 0;

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-muted-foreground text-sm">Manage team members and their access</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg">
                <Plus className="h-4 w-4 mr-2 text-primary-foreground" />
                <span className="text-primary-foreground">Add User</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex gap-2">
                    {["agent", "admin"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setNewRole(r)}
                        className={`px-4 py-2 rounded-lg border text-sm capitalize ${
                          newRole === r
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Departments</Label>
                  <div className="space-y-2">
                    {DEPARTMENTS.map((dept) => (
                      <label
                        key={dept.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                          newDepts.includes(dept.id)
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <Checkbox
                          checked={newDepts.includes(dept.id)}
                          onCheckedChange={(checked) =>
                            setNewDepts(
                              checked
                                ? [...newDepts, dept.id]
                                : newDepts.filter((d) => d !== dept.id)
                            )
                          }
                        />
                        <span>{dept.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={handleCreate} disabled={isLoading}>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Total Users",
              value: staffMembers.length,
              icon: Users,
              color: "text-primary",
            },
            { label: "Admins", value: totalAdmins, icon: Shield, color: "text-purple-400" },
            { label: "Active", value: totalActive, icon: Users, color: "text-green-400" },
            { label: "Suspended", value: totalSuspended, icon: Ban, color: "text-red-400" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Departments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((member) => (
                <TableRow
                  key={member.id}
                  className="cursor-pointer"
                  onClick={() => openUserDetail(member)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">
                          {member.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{member.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">{member.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        member.role === "admin"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      }
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(member.departments || []).slice(0, 2).map((d) => (
                        <Badge key={d} variant="secondary" className="text-[10px]">
                          {getDepartmentName(d)}
                        </Badge>
                      ))}
                      {(member.departments || []).length > 2 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{member.departments.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        member.is_suspended
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-green-500/20 text-green-400 border-green-500/30"
                      }
                    >
                      {member.is_suspended ? "Suspended" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.is_suspended ? (
                          <DropdownMenuItem onClick={() => handleUnsuspend(member.id)}>
                            Unsuspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => handleSuspend(member.id)}
                            disabled={member.id === currentStaff?.id}
                          >
                            Suspend
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(member.id)}
                          disabled={member.id === currentStaff?.id}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* User Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {selectedUser.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedUser.full_name}</h3>
                    <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Total Chats</span>
                    </div>
                    <p className="text-xl font-bold">{userChats.length}</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs text-muted-foreground">Avg Rating</span>
                    </div>
                    <p className="text-xl font-bold">
                      {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {ratedChats.length} rated
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  <Badge variant="outline" className="capitalize">
                    {selectedUser.role}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Departments</Label>
                  <div className="flex flex-wrap gap-1">
                    {(selectedUser.departments || []).map((d) => (
                      <Badge key={d} variant="secondary">
                        {getDepartmentName(d)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="text-sm">
                    {selectedUser.is_suspended
                      ? `Suspended: ${selectedUser.suspension_reason || "No reason"}`
                      : "Active"}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
