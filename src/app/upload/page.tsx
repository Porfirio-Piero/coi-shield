"use client";

import { useState } from "react";
import { useVendors } from "@/lib/hooks";
import { coiDocuments as coiDB, blobs } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Upload, Send, Link2, Copy } from "lucide-react";

export default function UploadRequestPage() {
  const { vendors, loading } = useVendors();
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [tab, setTab] = useState<"upload" | "request">("upload");

  // Upload form
  const [uploadForm, setUploadForm] = useState({
    insurer: "",
    policyType: "",
    policyNumber: "",
    effectiveDate: "",
    expiryDate: "",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Request form
  const [requestLink, setRequestLink] = useState("");
  const [requestExpiry, setRequestExpiry] = useState("7");

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  const handleUpload = async () => {
    if (!selectedVendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (!uploadForm.insurer || !uploadForm.expiryDate) {
      toast.error("Insurer and expiry date are required");
      return;
    }

    try {
      const blobKey = uploadFile ? `coi-${selectedVendorId}-${Date.now()}` : "";

      if (uploadFile && blobKey) {
        await blobs.put(blobKey, uploadFile);
      }

      await coiDB.create({
        vendorId: selectedVendorId,
        fileName: uploadFile?.name || "Manual Entry",
        fileType: uploadFile?.type || "manual",
        fileSize: uploadFile?.size || 0,
        insurer: uploadForm.insurer,
        policyType: uploadForm.policyType,
        policyNumber: uploadForm.policyNumber,
        effectiveDate: uploadForm.effectiveDate,
        expiryDate: uploadForm.expiryDate,
        blobKey,
        uploadedBy: "contractor",
      });

      toast.success("COI uploaded successfully!");
      setUploadForm({ insurer: "", policyType: "", policyNumber: "", effectiveDate: "", expiryDate: "" });
      setUploadFile(null);
    } catch (err) {
      toast.error("Failed to upload COI");
      console.error(err);
    }
  };

  const handleGenerateRequest = async () => {
    if (!selectedVendorId) {
      toast.error("Please select a vendor");
      return;
    }

    try {
      const { requestLinks } = await import("@/lib/db");
      const token = crypto.randomUUID().replace(/-/g, "");
      const now = new Date();
      const expiryDays = parseInt(requestExpiry) || 7;
      const expires = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);

      await requestLinks.create({
        vendorId: selectedVendorId,
        token,
        status: "sent",
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      });

      const url = `${window.location.origin}/upload/${token}`;
      setRequestLink(url);
      toast.success("Request link generated!");
    } catch (err) {
      toast.error("Failed to generate link");
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-slate-400 text-lg">Loading...</div></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Upload / Request</h1>
        <p className="text-slate-500 mt-1">Upload a COI document or send a request link to a subcontractor</p>
      </div>

      {/* Vendor Selection */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Select Vendor</CardTitle>
          <CardDescription>Choose the vendor for this COI</CardDescription>
        </CardHeader>
        <CardContent>
          {vendors.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-slate-500 mb-3">No vendors yet. Add one first.</p>
              <a href="/vendors" className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium h-8 px-2.5 gap-1.5">
                Add Vendor
              </a>
            </div>
          ) : (
            <Select value={selectedVendorId} onValueChange={(val) => setSelectedVendorId(val ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a vendor..." />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}{v.company ? ` — ${v.company}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedVendorId && (
        <>
          {/* Tab Switch */}
          <div className="flex gap-2">
            <Button
              variant={tab === "upload" ? "default" : "outline"}
              className={tab === "upload" ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setTab("upload")}
            >
              <Upload className="w-4 h-4 mr-2" /> Upload COI
            </Button>
            <Button
              variant={tab === "request" ? "default" : "outline"}
              className={tab === "request" ? "bg-blue-600 hover:bg-blue-700" : ""}
              onClick={() => setTab("request")}
            >
              <Send className="w-4 h-4 mr-2" /> Request COI
            </Button>
          </div>

          {tab === "upload" && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" /> Upload COI for {selectedVendor?.name}
                </CardTitle>
                <CardDescription>Upload a Certificate of Insurance document and enter key details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">COI Document (PDF or Image)</Label>
                  <Input id="file-upload" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                  {uploadFile && <p className="text-sm text-slate-500">{uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)</p>}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="insurer">Insurance Company *</Label>
                  <Input id="insurer" placeholder="e.g., State Farm, Hartford, Liberty Mutual" value={uploadForm.insurer} onChange={(e) => setUploadForm({ ...uploadForm, insurer: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="policy-type">Policy Type</Label><Input id="policy-type" placeholder="e.g., General Liability" value={uploadForm.policyType} onChange={(e) => setUploadForm({ ...uploadForm, policyType: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="policy-number">Policy Number</Label><Input id="policy-number" placeholder="e.g., GL-12345" value={uploadForm.policyNumber} onChange={(e) => setUploadForm({ ...uploadForm, policyNumber: e.target.value })} /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label htmlFor="effective-date">Effective Date</Label><Input id="effective-date" type="date" value={uploadForm.effectiveDate} onChange={(e) => setUploadForm({ ...uploadForm, effectiveDate: e.target.value })} /></div>
                  <div className="space-y-2"><Label htmlFor="expiry-date">Expiry Date *</Label><Input id="expiry-date" type="date" value={uploadForm.expiryDate} onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })} /></div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleUpload}>
                    <Upload className="w-4 h-4 mr-2" /> Upload COI
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {tab === "request" && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" /> Request COI from {selectedVendor?.name}
                </CardTitle>
                <CardDescription>Generate a time-limited link for the subcontractor to upload their COI directly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Link Expiration</Label>
                  <Select value={requestExpiry} onValueChange={(val) => setRequestExpiry(val ?? "7")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days (default)</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-slate-500">The subcontractor will have this many days to upload their COI.</p>
                </div>

                {!requestLink ? (
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleGenerateRequest}>
                    <Link2 className="w-4 h-4 mr-2" /> Generate Request Link
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800 mb-2">Request link generated!</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm bg-white px-3 py-2 rounded border text-slate-700 break-all">{requestLink}</code>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(requestLink)}><Copy className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500">
                      <p>Send this link to <strong>{selectedVendor?.name}</strong>. They can upload their COI without creating an account.</p>
                      <p className="mt-1">You can also view and copy this link from the vendor detail page.</p>
                    </div>
                    <Button variant="outline" onClick={() => setRequestLink("")}>Generate Another Link</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}