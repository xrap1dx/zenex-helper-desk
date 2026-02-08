export const DEPARTMENTS = [
  { id: "general_support", name: "General Inquiry", icon: "💬" },
  { id: "billing", name: "Billing & Payment", icon: "💳" },
  { id: "legal", name: "Legal & Compliance", icon: "📋" },
  { id: "technical", name: "Technical Support", icon: "🔧" },
] as const;

export function getDepartmentName(id: string): string {
  return DEPARTMENTS.find((d) => d.id === id)?.name || id;
}

export function getDepartmentIcon(id: string): string {
  return DEPARTMENTS.find((d) => d.id === id)?.icon || "💬";
}
