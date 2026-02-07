import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Loader2, Link2, MousePointerClick, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AffiliateCompany {
  id: string;
  name: string;
  code: string;
  link: string | null;
  clicks: number;
  status: string;
  created_at: string;
}

export function AffiliatePanel() {
  const { staff } = useStaff();
  const [company, setCompany] = useState<AffiliateCompany | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (staff?.id) fetchMyCompany();
  }, [staff?.id]);

  const fetchMyCompany = async () => {
    setIsLoading(true);
    // Find the company this affiliate member belongs to
    const { data: membership } = await supabase
      .from("affiliate_members")
      .select("company_id")
      .eq("staff_id", staff!.id)
      .maybeSingle();

    if (membership?.company_id) {
      const { data: companyData } = await supabase
        .from("affiliate_companies")
        .select("*")
        .eq("id", membership.company_id)
        .single();
      if (companyData) setCompany(companyData as AffiliateCompany);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">No Company Assigned</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            You haven't been linked to an affiliate company yet. Contact an administrator to get set up.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Affiliate Program</h1>
          <p className="text-muted-foreground text-sm">Your affiliate dashboard and statistics.</p>
        </div>

        {/* Company Info */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">{company.name}</h2>
            </div>
            <Badge
              variant="outline"
              className={
                company.status === "active"
                  ? "border-green-500/30 text-green-400"
                  : company.status === "suspended"
                  ? "border-yellow-500/30 text-yellow-400"
                  : "border-red-500/30 text-red-400"
              }
            >
              {company.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Referral Code */}
            <div className="rounded-lg border border-border p-4 space-y-1">
              <span className="text-xs text-muted-foreground">Referral Code</span>
              <p className="text-lg font-mono font-bold">{company.code}</p>
            </div>

            {/* Total Clicks */}
            <div className="rounded-lg border border-border p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Clicks</span>
              </div>
              <p className="text-lg font-bold">{company.clicks}</p>
            </div>
          </div>

          {/* Link */}
          {company.link && (
            <div className="rounded-lg border border-border p-4 space-y-1">
              <div className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Referral Link</span>
              </div>
              <p className="text-sm font-medium break-all">{company.link}</p>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Member since {new Date(company.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
