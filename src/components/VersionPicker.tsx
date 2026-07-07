/**
 * Version Picker Component
 * Shows version history and allows switching between portal versions
 */

import { useState, useEffect } from "react";
import { Layers, ChevronDown, ArrowLeftRight, Clock, FileDown, CheckCircle, GitBranch, RefreshCw } from "lucide-react";

interface VersionEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  changes: string[];
  git_tag: string;
  is_current: boolean;
}

interface Changelog {
  versions: VersionEntry[];
  total_improvements: number;
}

export default function VersionPicker() {
  const [changelog, setChangelog] = useState<Changelog | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [showConfirmSwitch, setShowConfirmSwitch] = useState<string | null>(null);

  useEffect(() => {
    fetchVersions();
  }, []);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/versions");
      const data = await res.json();
      setChangelog(data);
    } catch (err) {
      setError("Failed to load version history");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchVersion = async (versionId: string) => {
    setSwitching(versionId);
    setShowConfirmSwitch(null);
    setError(null);
    try {
      const res = await fetch(`/api/versions/switch/${versionId}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        // Server is restarting — show message
        setSwitching(null);
        // Show a message and reload after a delay
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      } else {
        setError(data.error || "Failed to switch version");
        setSwitching(null);
      }
    } catch (err) {
      setError("Failed to connect to server during version switch");
      setSwitching(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw size={32} className="animate-spin mx-auto mb-4 text-brand" />
        <p className="text-sm font-mono font-bold uppercase">Loading version history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 p-6 text-center">
        <p className="text-red-600 dark:text-red-400 font-bold font-mono text-sm">{error}</p>
        <button
          onClick={fetchVersions}
          className="mt-3 px-4 py-2 bg-red-500 text-white font-black uppercase text-xs border-2 border-red-700 hover:bg-red-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!changelog || changelog.versions.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-zinc-700">
        <Layers size={40} className="mx-auto mb-4 text-slate-400" />
        <p className="font-mono font-bold text-sm uppercase text-slate-500">No version history available</p>
      </div>
    );
  }

  const currentVersion = changelog.versions.find(v => v.is_current);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-2 border-black bg-white dark:bg-zinc-900 p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 border-2 border-black bg-purple-600 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Layers size={16} />
              </div>
              <h2 className="text-lg font-black uppercase tracking-tight">Version History</h2>
            </div>
            <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              {changelog.total_improvements === 0
                ? "Base version — no autonomous improvements yet"
                : `${changelog.total_improvements} auto-improvement${changelog.total_improvements !== 1 ? 's' : ''} deployed`}
            </p>
          </div>
          {currentVersion && (
            <div className="flex items-center gap-1.5 bg-neon-green/20 dark:bg-neon-green/10 border-2 border-black dark:border-zinc-700 px-3 py-1.5">
              <CheckCircle size={14} className="text-green-700 dark:text-green-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-green-800 dark:text-green-300">
                Active: {currentVersion.id}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Version Timeline */}
      <div className="space-y-3">
        {changelog.versions.map((version, index) => (
          <div
            key={version.id}
            className={`border-2 transition-all ${
              version.is_current
                ? "border-neon-green bg-neon-green/5 dark:bg-neon-green/5 shadow-[4px_4px_0px_0px_#00FF00]"
                : "border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]"
            }`}
          >
            {/* Version Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              onClick={() => setExpandedVersion(expandedVersion === version.id ? null : version.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 border-2 ${
                  version.is_current
                    ? "bg-neon-green text-black border-black"
                    : "bg-purple-600 text-white border-black dark:border-zinc-600"
                }`}>
                  <GitBranch size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm uppercase tracking-tight">{version.id}</span>
                    {version.is_current && (
                      <span className="text-[9px] bg-neon-green text-black font-black px-1.5 py-0.5 uppercase tracking-wider border border-black">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                    {version.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400">
                  <Clock size={11} />
                  {formatDate(version.date)}
                </div>
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform ${
                    expandedVersion === version.id ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {/* Expanded Details */}
            {expandedVersion === version.id && (
              <div className="border-t-2 border-black dark:border-zinc-700 p-4 space-y-4">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {version.description}
                </p>

                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                    Changes in this version
                  </h4>
                  <ul className="space-y-1">
                    {version.changes.map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs font-mono text-slate-700 dark:text-slate-300">
                        <span className="text-brand mt-0.5">▸</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>

                {!version.is_current && (
                  <div className="pt-2">
                    {showConfirmSwitch === version.id ? (
                      <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 p-3">
                        <p className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300 flex-1">
                          ⚠ This will restart the portal on version <strong>{version.id}</strong>. Continue?
                        </p>
                        <button
                          onClick={() => handleSwitchVersion(version.id)}
                          disabled={switching === version.id}
                          className="px-3 py-1.5 bg-amber-500 text-black font-black uppercase text-[10px] border-2 border-amber-700 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {switching === version.id ? (
                            <span className="flex items-center gap-1"><RefreshCw size={11} className="animate-spin" /> Switching...</span>
                          ) : "Yes, Switch"}
                        </button>
                        <button
                          onClick={() => setShowConfirmSwitch(null)}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-zinc-700 text-black dark:text-white font-black uppercase text-[10px] border-2 border-black dark:border-zinc-600 hover:bg-slate-300 dark:hover:bg-zinc-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowConfirmSwitch(version.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white font-black uppercase text-[10px] border-2 border-purple-800 hover:bg-purple-500 transition-colors"
                      >
                        <ArrowLeftRight size={11} />
                        Switch to {version.id}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="border-2 border-red-500 bg-red-50 dark:bg-red-900/20 p-3">
          <p className="text-xs font-mono font-bold text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Version info footer */}
      <div className="text-center text-[10px] font-mono font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider pt-4">
        Use the version switcher carefully — switching restarts the portal service
      </div>
    </div>
  );
}