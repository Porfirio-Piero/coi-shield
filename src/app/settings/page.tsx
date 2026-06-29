"use client";

import { useState, useEffect } from "react";
import { settings as settingsDB, vendors as vendorDB, coiDocuments as coiDB, requestLinks as requestLinkDB, exportAllData, importAllData, type Settings } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Save, Download, Upload, AlertTriangle, Info } from "lucide-react";

const DEFAULT_SETTINGS: Settings = {
  id: "default",
  alertEmail: "",
  companyName: "",
  alertDays: [90, 60, 30, 7],
  enableDigest: false,
};

export default function SettingsPage() {
  const [form, setForm] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState({ vendors: 0, documents: 0, links: 0 });

  useEffect(() => {
    async function load() {
      try {
        const s = await settingsDB.get();
        if (s) setForm(s);
        const [v, d, l] = await Promise.all([vendorDB.getAll(), coiDB.getAll(), requestLinkDB.getAll()]);
        setStats({ vendors: v.length, documents: d.length, links: l.length });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsDB.save(form);
      toast.success("Settings saved");
    } catch (err) {
      toast.error("Failed to save settings");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `coi-shield-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (err) {
      toast.error("Export failed");
      console.error(err);
    }
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!confirm("This will replace ALL your current data. Are you sure?")) return;

      setImporting(true);
      try {
        const text = await file.text();
        await importAllData(text);
        toast.success("Data imported successfully! Refreshing...");
        window.location.reload();
      } catch (err) {
        toast.error("Import failed — check the file format");
        console.error(err);
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-slate-400 text-lg">Loading...</div></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure alerts and manage your data</p>
      </div>

      {/* Email Alert Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Email Alert Settings</CardTitle>
          <CardDescription>
            Configure where expiry alerts are sent. Alerts are triggered at 90, 60, 30, and 7 days before expiration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="alert-email">Alert Email Address</Label>
            <Input id="alert-email" type="email" placeholder="you@company.com" value={form.alertEmail} onChange={(e) => setForm({ ...form, alertEmail: e.target.value })} />
            <p className="text-xs text-slate-500">
              All expiry notifications will be sent to this address. Requires Resend API key in environment variables.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input id="company-name" placeholder="Your Company Name" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            <p className="text-xs text-slate-500">
              Used in email subject lines and signatures.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Alert Days</Label>
            <div className="flex gap-2">
              {[90, 60, 30, 7].map((day) => (
                <label key={day} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.alertDays.includes(day)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, alertDays: [...form.alertDays, day].sort((a, b) => b - a) });
                      } else {
                        setForm({ ...form, alertDays: form.alertDays.filter((d) => d !== day) });
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">{day}d</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="enable-digest" checked={form.enableDigest} onChange={(e) => setForm({ ...form, enableDigest: e.target.checked })} className="rounded" />
            <Label htmlFor="enable-digest" className="cursor-pointer">
              Enable daily digest email (summary of all expiring COIs)
            </Label>
          </div>

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              Email alerts require a <strong>RESEND_API_KEY</strong> environment variable.
              Without it, compliance status is still tracked and visible in the dashboard, but email notifications won&apos;t be sent.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export and import your COI Shield data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{stats.vendors}</div>
              <div className="text-sm text-slate-500">Vendors</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{stats.documents}</div>
              <div className="text-sm text-slate-500">COI Documents</div>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{stats.links}</div>
              <div className="text-sm text-slate-500">Request Links</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Export Data</Button>
            <Button variant="outline" onClick={handleImport} disabled={importing}><Upload className="w-4 h-4 mr-2" /> {importing ? "Importing..." : "Import Data"}</Button>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <strong>Important:</strong> All data is stored in your browser&apos;s IndexedDB. Export regularly as backup.
              Clearing browser data will erase everything. File attachments (PDFs, images) are not included in exports.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle>About COI Shield</CardTitle></CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600 space-y-2">
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Storage:</strong> Client-side (IndexedDB + localStorage)</p>
            <p><strong>Email:</strong> Resend API (serverless)</p>
            <p>COI Shield helps small contractors track Certificate of Insurance documents and stay compliant.
               Never let a subcontractor&apos;s insurance expire unnoticed again.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}