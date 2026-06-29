"use client";

import { useState, useEffect, useCallback } from "react";
import { vendors as vendorDB, coiDocuments as coiDB, type Vendor, type COIDocument, type ComplianceStatus, getComplianceStatus, getDaysUntilExpiry } from "@/lib/db";

export function useVendors() {
  const [vendorList, setVendorList] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const all = await vendorDB.getAll();
      setVendorList(all.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Failed to load vendors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { vendors: vendorList, loading, refresh };
}

export function useVendorCOIs(vendorId: string) {
  const [documents, setDocuments] = useState<COIDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await coiDB.getByVendorId(vendorId);
      setDocuments(docs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()));
    } catch (err) {
      console.error("Failed to load COIs:", err);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => { refresh(); }, [refresh]);
  return { documents, loading, refresh };
}

export function useDashboard() {
  const [stats, setStats] = useState({
    totalVendors: 0,
    compliant: 0,
    expiringSoon: 0,
    expired: 0,
    noCOI: 0,
    recentAlerts: [] as { vendorId: string; vendorName: string; status: ComplianceStatus; daysUntil: number | null }[],
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const allVendors = await vendorDB.getAll();
      const allCOIs = await coiDB.getAll();

      const vendorCOIMap = new Map<string, COIDocument>();
      // Get the most recent COI for each vendor
      for (const coi of allCOIs) {
        const existing = vendorCOIMap.get(coi.vendorId);
        if (!existing || new Date(coi.effectiveDate) > new Date(existing.effectiveDate)) {
          vendorCOIMap.set(coi.vendorId, coi);
        }
      }

      let compliant = 0;
      let expiringSoon = 0;
      let expired = 0;
      let noCOI = 0;
      const recentAlerts: typeof stats.recentAlerts = [];

      for (const vendor of allVendors) {
        const coi = vendorCOIMap.get(vendor.id);
        const status = getComplianceStatus(coi);
        const days = getDaysUntilExpiry(coi);

        switch (status) {
          case 'compliant': compliant++; break;
          case 'expiring_soon': expiringSoon++; break;
          case 'expired': expired++; break;
          case 'no_coi': noCOI++; break;
        }

        if (status !== 'compliant') {
          recentAlerts.push({
            vendorId: vendor.id,
            vendorName: vendor.name,
            status,
            daysUntil: days,
          });
        }
      }

      // Sort alerts: expired first, then expiring soon
      recentAlerts.sort((a, b) => {
        if (a.status === 'expired' && b.status !== 'expired') return -1;
        if (a.status !== 'expired' && b.status === 'expired') return 1;
        return (a.daysUntil ?? 999) - (b.daysUntil ?? 999);
      });

      setStats({
        totalVendors: allVendors.length,
        compliant,
        expiringSoon,
        expired,
        noCOI,
        recentAlerts: recentAlerts.slice(0, 10),
      });
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { stats, loading, refresh };
}