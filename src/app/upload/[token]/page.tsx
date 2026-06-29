"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { requestLinks as requestLinkDB, vendors as vendorDB, coiDocuments as coiDB, blobs, type RequestLink, type Vendor } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Upload, CheckCircle, XCircle, Clock } from "lucide-react";

export default function GuestUploadPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [alreadyUploaded, setAlreadyUploaded] = useState(false);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [link, setLink] = useState<RequestLink | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [insurer, setInsurer] = useState("");
  const [policyType, setPolicyType] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function validateLink() {
      try {
        const foundLink = await requestLinkDB.getByToken(token);
        
        if (!foundLink) {
          setValid(false);
          setLoading(false);
          return;
        }

        // Check if expired
        if (new Date(foundLink.expiresAt) < new Date()) {
          setExpired(true);
          setValid(false);
          setLoading(false);
          return;
        }

        // Check if already uploaded
        if (foundLink.status === "uploaded") {
          setAlreadyUploaded(true);
          setValid(false);
          setLoading(false);
          return;
        }

        // Mark as opened
        await requestLinkDB.update({
          ...foundLink,
          status: "opened",
          openedAt: new Date().toISOString(),
        });

        const v = await vendorDB.getById(foundLink.vendorId);
        setVendor(v || null);
        setLink(foundLink);
        setValid(true);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    validateLink();
  }, [token]);

  const handleSubmit = async () => {
    if (!insurer || !expiryDate) {
      alert("Please fill in the insurance company and expiry date.");
      return;
    }

    if (!link || !vendor) return;

    setSubmitting(true);
    try {
      const blobKey = file ? `coi-${vendor.id}-${Date.now()}` : "";

      if (file && blobKey) {
        await blobs.put(blobKey, file);
      }

      await coiDB.create({
        vendorId: vendor.id,
        fileName: file?.name || "Guest Upload — " + insurer,
        fileType: file?.type || "manual",
        fileSize: file?.size || 0,
        insurer,
        policyType,
        policyNumber,
        effectiveDate,
        expiryDate,
        blobKey,
        uploadedBy: "subcontractor",
      });

      // Mark link as uploaded
      await requestLinkDB.update({
        ...link,
        status: "uploaded",
        uploadedAt: new Date().toISOString(),
      });

      setSubmitted(true);
    } catch (err) {
      alert("Failed to submit. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="text-slate-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">COI Submitted!</h1>
            <p className="text-slate-600 mb-6">
              Your Certificate of Insurance has been submitted to <strong>{vendor?.name || vendor?.company}</strong>. 
              They will review it and update their records.
            </p>
            <p className="text-sm text-slate-400">You can close this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Link Expired</h1>
            <p className="text-slate-600">
              This upload link has expired. Please contact the contractor to request a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyUploaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Already Submitted</h1>
            <p className="text-slate-600">
              A COI has already been submitted through this link. No further action needed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg">
          <CardContent className="pt-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Invalid Link</h1>
            <p className="text-slate-600">
              This upload link is not valid. Please check the URL and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Upload Your COI</h1>
          <p className="text-slate-600 mt-1">
            {vendor?.name || vendor?.company} has requested your Certificate of Insurance
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6 space-y-4">
            <Alert>
              <Shield className="w-4 h-4" />
              <AlertDescription>
                Your information is stored securely. No account creation required. 
                This link expires on <strong>{link?.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : "N/A"}</strong>.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="coi-file">Upload COI Document</Label>
              <Input
                id="coi-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && (
                <p className="text-sm text-slate-500">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="insurer">Insurance Company *</Label>
              <Input
                id="insurer"
                placeholder="e.g., State Farm"
                value={insurer}
                onChange={(e) => setInsurer(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="policy-type">Policy Type</Label>
                <Input
                  id="policy-type"
                  placeholder="e.g., General Liability"
                  value={policyType}
                  onChange={(e) => setPolicyType(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policy-number">Policy Number</Label>
                <Input
                  id="policy-number"
                  placeholder="e.g., GL-12345"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effective-date">Effective Date</Label>
                <Input
                  id="effective-date"
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry-date">Expiry Date *</Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
              onClick={handleSubmit}
              disabled={submitting || !insurer || !expiryDate}
            >
              <Upload className="w-4 h-4 mr-2" />
              {submitting ? "Submitting..." : "Submit COI"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}