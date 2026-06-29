"use client";

import { type ComplianceStatus } from "@/lib/db";

const statusConfig: Record<ComplianceStatus, { label: string; bg: string; text: string; border: string }> = {
  compliant: { label: "Compliant", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  expiring_soon: { label: "Expiring Soon", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  expired: { label: "Expired", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  no_coi: { label: "No COI", bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
};

export function StatusBadge({ status }: { status: ComplianceStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${config.border} border`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'compliant' ? 'bg-green-500' : status === 'expiring_soon' ? 'bg-yellow-500' : status === 'expired' ? 'bg-red-500' : 'bg-gray-400'}`} />
      {config.label}
    </span>
  );
}

export function StatusDot({ status }: { status: ComplianceStatus }) {
  const colors: Record<ComplianceStatus, string> = {
    compliant: "bg-green-500",
    expiring_soon: "bg-yellow-500",
    expired: "bg-red-500",
    no_coi: "bg-gray-400",
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status]}`} />;
}