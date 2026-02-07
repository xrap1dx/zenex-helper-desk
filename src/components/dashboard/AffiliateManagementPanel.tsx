import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2, Search, Building2, MousePointerClick, Link2, Ban, CheckCircle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CompanyMembersDialog } from "./CompanyMembersDialog";

interface AffiliateCompany {
  id: string;
  name: string;
  code: string;
  link: string | null;
  clicks: number;
  status: string;
  created_at: string;
  created_by: string | null;
}

export function AffiliateManagementPanel() {
  const { staff } = useStaff();
  const [companies, setCompanies] = useState<AffiliateCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [membersCompany, setMembersCompany] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  // New company form
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newLink, setNewLink] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("affiliate_companies")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCompanies(data as AffiliateCompany[]);
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newCode.trim()) {
      toast({ title: "Error", description: "Name and code are required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from("affiliate_companies").insert({
      name: newName.trim(),
      code: newCode.trim(),
      link: newLink.trim() || null,
      created_by: staff?.id || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Company added." });
      setIsDialogOpen(false);
      setNewName("");
      setNewCode("");
      setNewLink("");
      fetchCompanies();
    }
    setIsSaving(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase
      .from("affiliate_companies")
      .update({ status })
      .eq("id", id);
    if (!error) {
      toast({ title: "Updated", description: `Company status set to ${status}.` });
      fetchCompanies();
    }
  };

  const handleDelete = async (id: string) => {
    // Delete members first, then clicks, then company
    await supabase.from("affiliate_members").delete().eq("company_id", id);
    await supabase.from("affiliate_clicks").delete().eq("company_id", id);
    const { error } = await supabase.from("affiliate_companies").delete().eq("id", id);
    if (!error) {
      toast({ title: "Deleted", description: "Company removed." });
      fetchCompanies();
    }
  };

  const handleUpdateLink = async (id: string, link: string) => {
    await supabase.from("affiliate_companies").update({ link }).eq("id", id);
    fetchCompanies();
  };

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalClicks = companies.reduce((sum, c) => sum + c.clicks, 0);
  const activeCount = companies.filter((c) => c.status === "active").length;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Affiliate Management</h1>
            <p className="text-muted-foreground text-sm">Manage affiliate companies, codes, and links.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg">
                <Plus className="h-4 w-4 mr-2 text-primary-foreground" />
                <span className="text-primary-foreground">Add Company</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Affiliate Company</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input placeholder="e.g. Acme Corp" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Referral Code</Label>
                  <Input placeholder="e.g. ACME2025" value={newCode} onChange={(e) => setNewCode(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Link (optional)</Label>
                  <Input placeholder="e.g. https://zenex.site/ACME2025" value={newLink} onChange={(e) => setNewLink(e.target.value)} />
                </div>
                <Button className="w-full gradient-bg" onClick={handleCreate} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <span className="text-primary-foreground">Create Company</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Companies</span>
            </div>
            <p className="text-2xl font-bold">{companies.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <p className="text-2xl font-bold">{activeCount}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <MousePointerClick className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">Total Clicks</span>
            </div>
            <p className="text-2xl font-bold">{totalClicks}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies or codes..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Company</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No companies found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{company.code}</code>
                    </TableCell>
                    <TableCell>
                      {company.link ? (
                        <span className="text-xs text-muted-foreground truncate block max-w-[180px]">{company.link}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{company.clicks}</TableCell>
                    <TableCell>
                      <Select value={company.status} onValueChange={(v) => handleStatusChange(company.id, v)}>
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Manage Members"
                          onClick={() => setMembersCompany({ id: company.id, name: company.name })}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {company.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the company, its members, and all click data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(company.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Members Dialog */}
        {membersCompany && (
          <CompanyMembersDialog
            companyId={membersCompany.id}
            companyName={membersCompany.name}
            open={!!membersCompany}
            onOpenChange={(open) => { if (!open) setMembersCompany(null); }}
          />
        )}
      </div>
    </div>
  );
}
