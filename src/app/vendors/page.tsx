"use client";

import { useState } from "react";
import { useVendors } from "@/lib/hooks";
import { vendors as vendorDB, coiDocuments as coiDB, type Vendor, type COIDocument, type ComplianceStatus, getComplianceStatus, getDaysUntilExpiry, formatDate } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import { Plus, Search, Users, Building2, Trash2 } from "lucide-react";

const trades = [
  "General Contractor", "Plumber", "Electrician", "HVAC", "Roofer",
  "Landscaper", "Painter", "Cleaner", "Handyman", "Carpenter",
  "Mason", "Concrete", "Drywall", "Flooring", "Paving",
  "Other"
];

export default function VendorsPage() {
  const { vendors, loading, refresh } = useVendors();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ComplianceStatus>("all");
  const [vendorCOIStatus, setVendorCOIStatus] = useState<Record<string, { status: ComplianceStatus; days: number | null }>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [newVendor, setNewVendor] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    trade: "Other",
    notes: "",
  });

  // Load COI status for each vendor
  useState(() => {
    if (vendors.length === 0) return;
    async function loadStatus() {
      const statusMap: Record<string, { status: ComplianceStatus; days: number | null }> = {};
      for (const vendor of vendors) {
        const docs = await coiDB.getByVendorId(vendor.id);
        if (docs.length === 0) {
          statusMap[vendor.id] = { status: "no_coi", days: null };
        } else {
          const latest = docs.reduce((a, b) => new Date(a.expiryDate) > new Date(b.expiryDate) ? a : b);
          statusMap[vendor.id] = { status: getComplianceStatus(latest), days: getDaysUntilExpiry(latest) };
        }
      }
      setVendorCOIStatus(statusMap);
    }
    loadStatus();
  });

  const filteredVendors = vendors.filter((v) => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.company?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filter !== "all") {
      const status = vendorCOIStatus[v.id]?.status;
      if (status !== filter) return false;
    }
    return true;
  });

  const handleAddVendor = async () => {
    if (!newVendor.name) {
      toast.error("Vendor name is required");
      return;
    }
    try {
      await vendorDB.create(newVendor);
      toast.success("Vendor added!");
      setShowAddDialog(false);
      setNewVendor({ name: "", company: "", email: "", phone: "", trade: "Other", notes: "" });
      refresh();
    } catch (err) {
      toast.error("Failed to add vendor");
      console.error(err);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm("Are you sure? This will also delete all COI documents for this vendor.")) return;
    try {
      await vendorDB.delete(id);
      toast.success("Vendor deleted");
      refresh();
    } catch (err) {
      toast.error("Failed to delete vendor");
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-slate-400 text-lg">Loading vendors...</div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Vendors</h1>
          <p className="text-slate-500 mt-1">{vendors.length} vendor{vendors.length !== 1 ? "s" : ""} tracked</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Add Vendor</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="vendor-name">Name *</Label>
                <Input id="vendor-name" placeholder="Contact name" value={newVendor.name} onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-company">Company</Label>
                <Input id="vendor-company" placeholder="Company name" value={newVendor.company} onChange={(e) => setNewVendor({ ...newVendor, company: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor-email">Email</Label>
                  <Input id="vendor-email" type="email" placeholder="email@example.com" value={newVendor.email} onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor-phone">Phone</Label>
                  <Input id="vendor-phone" type="tel" placeholder="(555) 123-4567" value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-trade">Trade</Label>
                <Select value={newVendor.trade || "Other"} onValueChange={(val) => setNewVendor({ ...newVendor, trade: val ?? "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {trades.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-notes">Notes</Label>
                <Input id="vendor-notes" placeholder="Optional notes" value={newVendor.notes} onChange={(e) => setNewVendor({ ...newVendor, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddVendor}>Add Vendor</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filter} onValueChange={(val) => setFilter((val ?? "all") as "all" | ComplianceStatus)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="compliant">Compliant</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="no_coi">No COI</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vendors Table */}
      {filteredVendors.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {vendors.length === 0 ? "No vendors yet" : "No matching vendors"}
            </h3>
            <p className="text-slate-500">
              {vendors.length === 0 ? "Add your first vendor to start tracking COIs." : "Try adjusting your search or filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Trade</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVendors.map((vendor) => {
                const coiStatus = vendorCOIStatus[vendor.id];
                return (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-slate-900">{vendor.name}</div>
                        {vendor.company && <div className="text-sm text-slate-500">{vendor.company}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                        <Building2 className="w-3.5 h-3.5" />
                        {vendor.trade || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {coiStatus ? <StatusBadge status={coiStatus.status} /> : <span className="text-sm text-slate-400">Loading...</span>}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {coiStatus?.days !== null && coiStatus?.days !== undefined
                          ? coiStatus.days < 0
                            ? `Expired ${Math.abs(coiStatus.days)}d ago`
                            : `${coiStatus.days}d left`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/vendors/${vendor.id}`} className="inline-flex items-center justify-center rounded-lg text-sm font-medium hover:bg-muted hover:text-foreground h-7 px-2 gap-1">View</Link>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteVendor(vendor.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}