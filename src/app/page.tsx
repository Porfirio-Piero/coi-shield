"use client";

import { useState } from "react";
import { useDashboard } from "@/lib/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  FileQuestion,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const { stats, loading } = useDashboard();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-lg">Loading dashboard...</div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Vendors", value: stats.totalVendors, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Compliant", value: stats.compliant, icon: ShieldCheck, color: "text-green-600", bg: "bg-green-50" },
    { label: "Expiring Soon", value: stats.expiringSoon, icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Expired", value: stats.expired, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
    { label: "No COI on File", value: stats.noCOI, icon: FileQuestion, color: "text-gray-600", bg: "bg-gray-50" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          COI compliance at a glance — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Compliance Overview */}
      {stats.totalVendors > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Compliance Overview
            </CardTitle>
            <CardDescription>
              {stats.compliant} of {stats.totalVendors} vendors compliant ({Math.round((stats.compliant / stats.totalVendors) * 100)}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
              {stats.totalVendors > 0 && (
                <div className="h-full flex">
                  <div className="bg-green-500 h-full" style={{ width: `${(stats.compliant / stats.totalVendors) * 100}%` }} />
                  <div className="bg-yellow-500 h-full" style={{ width: `${(stats.expiringSoon / stats.totalVendors) * 100}%` }} />
                  <div className="bg-red-500 h-full" style={{ width: `${(stats.expired / stats.totalVendors) * 100}%` }} />
                  <div className="bg-gray-300 h-full" style={{ width: `${(stats.noCOI / stats.totalVendors) * 100}%` }} />
                </div>
              )}
            </div>
            <div className="flex gap-6 mt-3 text-sm text-slate-600">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" /> Compliant ({stats.compliant})</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500" /> Expiring ({stats.expiringSoon})</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> Expired ({stats.expired})</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300" /> No COI ({stats.noCOI})</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Compliance Alerts</CardTitle>
          <CardDescription>
            Vendors needing attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentAlerts.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              {stats.totalVendors === 0
                ? "No vendors yet. Add your first vendor to get started."
                : "All vendors are compliant! 🎉"}
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentAlerts.map((alert) => (
                <Link
                  key={alert.vendorId}
                  href={`/vendors/${alert.vendorId}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={alert.status} />
                    <span className="font-medium text-slate-900">{alert.vendorName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    {alert.daysUntil !== null && alert.daysUntil < 0 && (
                      <span className="text-red-600 font-medium">Expired {Math.abs(alert.daysUntil)} days ago</span>
                    )}
                    {alert.daysUntil !== null && alert.daysUntil >= 0 && alert.daysUntil <= 30 && (
                      <span className="text-yellow-600 font-medium">Expires in {alert.daysUntil} days</span>
                    )}
                    {alert.status === 'no_coi' && (
                      <span className="text-gray-600">No COI on file</span>
                    )}
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {stats.totalVendors === 0 && (
        <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Get Started with COI Shield</h3>
            <p className="text-slate-600 mb-6">
              Add your first vendor to start tracking insurance compliance.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/vendors"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                Add Vendor
              </Link>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 bg-white text-blue-600 border border-blue-200 px-5 py-2.5 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                Upload COI
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}