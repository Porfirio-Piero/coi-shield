"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { vendors as vendorDB, coiDocuments as coiDB, requestLinks as requestLinkDB, blobs, type Vendor, type COIDocument, type RequestLink, type ComplianceStatus, getComplianceStatus, getDaysUntilExpiry, formatDate } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { toast } from "sonner";
import { ArrowLeft, Edit2, Upload, Send, Trash2, ExternalLink, Copy, FileText, Link2, Mail } from "lucide-react";
import Link from "next/link";

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [documents, setDocuments] = useState<COIDocument[]>([]);
  const [links, setLinks] = useState<RequestLink[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit form
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", company: "", email: "", phone: "", trade: "", notes: "" });

  // COI upload form
  const [showCOIDialog, setShowCOIDialog] = useState(false);
  const [coiForm, setCoiForm] = useState({ insurer: "", policyType: "", policyNumber: "", effectiveDate: "", expiryDate: "" });
  const [coiFile, setCoiFile] = useState<File | null>(null);

  // Request link
  const [requestLinkResult, setRequestLinkResult] = useState("");

  const loadVendor = useCallback(async () => {
    try {
      const v = await vendorDB.getById(id);
      if (!v) { router.push("/vendors"); return; }
      setVendor(v);
      setEditForm({ name: v.name, company: v.company || "", email: v.email || "", phone: v.phone || "", trade: v.trade || "", notes: v.notes || "" });

      const docs = await coiDB.getByVendorId(id);
      setDocuments(docs);

      const allLinks = await requestLinkDB.getByVendorId(id);
      setLinks(allLinks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { loadVendor(); }, [loadVendor]);

  const handleUpdateVendor = async () => {
    if (!vendor) return;
    try {
      await vendorDB.update({ ...vendor, ...editForm });
      toast.success("Vendor updated");
      setShowEditDialog(false);
      loadVendor();
    } catch (err) {
      toast.error("Failed to update vendor");
      console.error(err);
    }
  };

  const handleAddCOI = async () => {
    if (!coiForm.insurer || !coiForm.expiryDate) {
      toast.error("Insurer and expiry date are required");
      return;
    }
    try {
      const blobKey = coiFile ? `coi-${id}-${Date.now()}` : "";
      if (coiFile && blobKey) {
        await blobs.put(blobKey, coiFile);
      }
      await coiDB.create({
        vendorId: id,
        fileName: coiFile?.name || "Manual Entry",
        fileType: coiFile?.type || "manual",
        fileSize: coiFile?.size || 0,
        insurer: coiForm.insurer,
        policyType: coiForm.policyType,
        policyNumber: coiForm.policyNumber,
        effectiveDate: coiForm.effectiveDate,
        expiryDate: coiForm.expiryDate,
        blobKey,
        uploadedBy: "contractor",
      });
      toast.success("COI added!");
      setShowCOIDialog(false);
      setCoiForm({ insurer: "", policyType: "", policyNumber: "", effectiveDate: "", expiryDate: "" });
      setCoiFile(null);
      loadVendor();
    } catch (err) {
      toast.error("Failed to add COI");
      console.error(err);
    }
  };

  const handleDeleteCOI = async (docId: string) => {
    if (!confirm("Delete this COI document?")) return;
    try {
      await coiDB.delete(docId);
      toast.success("COI deleted");
      loadVendor();
    } catch (err) {
      toast.error("Failed to delete COI");
      console.error(err);
    }
  };

  const handleGenerateRequestLink = async () => {
    if (!vendor) return;
    try {
      const token = crypto.randomUUID().replace(/-/g, "");
      const now = new Date();
      const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await requestLinkDB.create({
        vendorId: vendor.id,
        token,
        status: "sent",
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      });
      const url = `${window.location.origin}/upload/${token}`;
      setRequestLinkResult(url);
      toast.success("Request link generated!");
      loadVendor();
    } catch (err) {
      toast.error("Failed to generate link");
      console.error(err);
    }
  };

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const downloadCOI = async (doc: COIDocument) => {
    if (!doc.blobKey) {
      toast.error("No file attached to this COI");
      return;
    }
    try {
      const blob = await blobs.get(doc.blobKey);
      if (!blob) { toast.error("File not found"); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download");
      console.error(err);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-slate-400 text-lg">Loading...</div></div>;
  if (!vendor) return <div className="text-center py-12 text-slate-500">Vendor not found</div>;

  const latestCOI = documents.length > 0 ? documents.reduce((a, b) => new Date(a.expiryDate) > new Date(b.expiryDate) ? a : b) : null;
  const complianceStatus: ComplianceStatus = getComplianceStatus(latestCOI ?? undefined);
  const daysUntil = getDaysUntilExpiry(latestCOI ?? undefined);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/vendors" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{vendor.name}</h1>
            {vendor.company && <p className="text-slate-500">{vendor.company}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogTrigger render={<Button variant="outline"><Edit2 className="w-4 h-4 mr-2" />Edit</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Vendor</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Company</Label><Input value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Trade</Label><Input value={editForm.trade} onChange={(e) => setEditForm({ ...editForm, trade: e.target.value })} /></div>
                <div className="space-y-2"><Label>Notes</Label><Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleUpdateVendor}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={showCOIDialog} onOpenChange={setShowCOIDialog}>
            <DialogTrigger render={<Button className="bg-blue-600 hover:bg-blue-700"><Upload className="w-4 h-4 mr-2" />Add COI</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Add COI Document</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2"><Label>COI File (optional)</Label><Input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setCoiFile(e.target.files?.[0] || null)} /></div>
                <div className="space-y-2"><Label>Insurance Company *</Label><Input placeholder="e.g., State Farm" value={coiForm.insurer} onChange={(e) => setCoiForm({ ...coiForm, insurer: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Policy Type</Label><Input placeholder="e.g., General Liability" value={coiForm.policyType} onChange={(e) => setCoiForm({ ...coiForm, policyType: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Policy Number</Label><Input placeholder="e.g., GL-12345" value={coiForm.policyNumber} onChange={(e) => setCoiForm({ ...coiForm, policyNumber: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Effective Date</Label><Input type="date" value={coiForm.effectiveDate} onChange={(e) => setCoiForm({ ...coiForm, effectiveDate: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Expiry Date *</Label><Input type="date" value={coiForm.expiryDate} onChange={(e) => setCoiForm({ ...coiForm, expiryDate: e.target.value })} /></div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddCOI}>Save COI</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Compliance Status</p>
              <div className="flex items-center gap-3 mt-1">
                <StatusBadge status={complianceStatus} />
                {daysUntil !== null && (
                  <span className="text-sm text-slate-600">
                    {daysUntil < 0 ? `Expired ${Math.abs(daysUntil)} days ago` : `${daysUntil} days until expiration`}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">COI Documents</p>
              <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
            </div>
          </div>
          {vendor.email && <p className="text-sm text-slate-500 mt-3"><Mail className="w-3.5 h-3.5 inline mr-1" />{vendor.email}</p>}
          {vendor.phone && <p className="text-sm text-slate-500">{vendor.phone}</p>}
        </CardContent>
      </Card>

      {/* Request Link */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Link2 className="w-5 h-5 text-blue-600" /> Request Link</CardTitle>
          <CardDescription>Generate a secure link for this vendor to upload their COI directly</CardDescription>
        </CardHeader>
        <CardContent>
          {!requestLinkResult ? (
            <Button variant="outline" onClick={handleGenerateRequestLink}><Send className="w-4 h-4 mr-2" />Generate Request Link</Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-slate-100 px-3 py-2 rounded break-all">{requestLinkResult}</code>
                <Button variant="outline" size="icon-sm" onClick={() => copyLink(requestLinkResult)}><Copy className="w-4 h-4" /></Button>
              </div>
              <p className="text-sm text-slate-500">Link expires in 7 days</p>
            </div>
          )}
          {links.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-slate-700">Previous Links</p>
              {links.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-600 truncate">...{link.token.slice(-8)}</p>
                    <p className="text-xs text-slate-400">{formatDate(link.createdAt)} — {link.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyLink(`${window.location.origin}/upload/${link.token}`)}>Copy Link</Button>
                    <a href={`/upload/${link.token}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-lg h-7 px-2 gap-1 text-sm font-medium hover:bg-muted hover:text-foreground">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* COI Documents */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> COI Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-200" />
              <p>No COI documents yet</p>
              <p className="text-sm mt-1">Click &quot;Add COI&quot; to upload one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const status = getComplianceStatus(doc);
                const days = getDaysUntilExpiry(doc);
                return (
                  <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border border-slate-100 bg-white">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-900">{doc.insurer}</span>
                        <StatusBadge status={status} />
                      </div>
                      <div className="text-sm text-slate-500 space-x-3">
                        {doc.policyType && <span>{doc.policyType}</span>}
                        {doc.policyNumber && <span>#{doc.policyNumber}</span>}
                        <span>Exp: {formatDate(doc.expiryDate)}</span>
                        {days !== null && <span className={days < 0 ? "text-red-600" : days <= 30 ? "text-yellow-600" : "text-green-600"}>
                          ({days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`})
                        </span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.blobKey && (
                        <Button variant="outline" size="sm" onClick={() => downloadCOI(doc)}>Download</Button>
                      )}
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteCOI(doc.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}