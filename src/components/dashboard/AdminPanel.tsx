import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Trash2, UserPlus, Loader2 } from "lucide-react";
import { createStaffMember } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface StaffMember {
  id: string;
  username: string;
  display_name: string;
  role: "admin" | "manager" | "associate";
  department_id: string | null;
  is_online: boolean;
  created_at: string;
  department?: { name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

export function AdminPanel() {
  const { staff: currentStaff } = useStaff();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // New staff form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "manager" | "associate">("associate");
  const [newDepartment, setNewDepartment] = useState<string>("");

  useEffect(() => {
    fetchStaff();
    fetchDepartments();
  }, []);

  const fetchStaff = async () => {
    const { data } = await supabase
      .from("staff")
      .select(`*, department:departments(name)`)
      .order("created_at", { ascending: false });
    if (data) setStaffMembers(data as StaffMember[]);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("*");
    if (data) setDepartments(data);
  };

  const handleCreateStaff = async () => {
    if (!newUsername || !newPassword || !newDisplayName || !currentStaff) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await createStaffMember(
      newUsername,
      newPassword,
      newDisplayName,
      newRole,
      newDepartment || null,
      currentStaff.id
    );

    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Staff member created successfully.",
      });
      setIsDialogOpen(false);
      resetForm();
      fetchStaff();
    }
    setIsLoading(false);
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (staffId === currentStaff?.id) {
      toast({
        title: "Error",
        description: "You cannot delete your own account.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("staff").delete().eq("id", staffId);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete staff member.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Staff member deleted successfully.",
      });
      fetchStaff();
    }
  };

  const handleUpdateRole = async (staffId: string, role: "admin" | "manager" | "associate") => {
    const { error } = await supabase
      .from("staff")
      .update({ role })
      .eq("id", staffId);
    if (!error) {
      toast({
        title: "Success",
        description: "Role updated successfully.",
      });
      fetchStaff();
    }
  };

  const handleUpdateDepartment = async (staffId: string, departmentId: string) => {
    const { error } = await supabase
      .from("staff")
      .update({ department_id: departmentId || null })
      .eq("id", staffId);
    if (!error) {
      toast({
        title: "Success",
        description: "Department updated successfully.",
      });
      fetchStaff();
    }
  };

  const resetForm = () => {
    setNewUsername("");
    setNewPassword("");
    setNewDisplayName("");
    setNewRole("associate");
    setNewDepartment("");
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "manager":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "associate":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Staff Management</h1>
            <p className="text-muted-foreground">
              Manage staff accounts, roles, and department assignments.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg">
                <UserPlus className="h-4 w-4 mr-2 text-primary-foreground" />
                <span className="text-primary-foreground">Add Staff</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    placeholder="Enter username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    placeholder="Enter display name"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="associate">Associate</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={newDepartment} onValueChange={setNewDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full gradient-bg"
                  onClick={handleCreateStaff}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  <span className="text-primary-foreground">Create Staff Member</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Staff Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Staff Member</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary-foreground">
                          {member.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{member.display_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.username}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleUpdateRole(member.id, v as any)}
                      disabled={member.id === currentStaff?.id}
                    >
                      <SelectTrigger className="w-[120px]">
                        <Badge
                          variant="outline"
                          className={getRoleBadgeColor(member.role)}
                        >
                          {member.role}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="associate">Associate</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={member.department_id || ""}
                      onValueChange={(v) => handleUpdateDepartment(member.id, v)}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="No department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          member.is_online ? "bg-green-400" : "bg-muted-foreground"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {member.is_online ? "Online" : "Offline"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteStaff(member.id)}
                      disabled={member.id === currentStaff?.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
