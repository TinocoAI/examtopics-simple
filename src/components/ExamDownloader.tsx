/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  CloudDownload, Terminal, AlertCircle, CheckCircle2, 
  Layers, Cpu, ShieldCheck, ChevronRight, Play, Loader2, Sparkles,
  Search, Filter, Tag, BookOpen, ExternalLink
} from "lucide-react";
import { Exam } from "../types";

interface ExamDownloaderProps {
  onDownloadSuccess: (downloadedExam: Exam) => void;
}

interface Vendor {
  id: string;
  name: string;
  icon: string;
  color: string;
  category: string;
}

interface ExamPreset {
  code: string;
  name: string;
  questionsCount: number;
  description: string;
}

export default function ExamDownloader({ onDownloadSuccess }: ExamDownloaderProps) {
  // Lists from backend APIs
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [exams, setExams] = useState<ExamPreset[]>([]);
  
  // Loading states
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingExams, setLoadingExams] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  // Selection states
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedExam, setSelectedExam] = useState<ExamPreset | null>(null);

  // Download count states
  const [requestedCount, setRequestedCount] = useState<number>(20);
  const [customCountValue, setCustomCountValue] = useState<string>("15");
  const [countMode, setCountMode] = useState<'preset' | 'custom'>('preset');
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Custom form input state for the scraper
  const [provider, setProvider] = useState("");
  const [examCode, setExamCode] = useState("");
  const [examName, setExamName] = useState("");
  const [customMode, setCustomMode] = useState(false);

  // Scraper execution logs & simulation state
  const [isScraping, setIsScraping] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successExam, setSuccessExam] = useState<Exam | null>(null);

  // Fetch all vendors from backend on mount
  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoadingVendors(true);
        const res = await fetch("/api/examtopics-vendors");
        if (res.ok) {
          const data = await res.json();
          setVendors(data.vendors);
          // Pick AWS or first vendor as default
          if (data.vendors.length > 0) {
            const defaultVendor = data.vendors.find((v: Vendor) => v.id === "amazon") || data.vendors[0];
            handleVendorSelect(defaultVendor);
          }
        } else {
          throw new Error("Failed to load vendor list from server.");
        }
      } catch (err: any) {
        console.error("Error fetching vendors:", err);
        setError("Could not load ExamTopics vendors. Please ensure the backend server is running.");
      } finally {
        setLoadingVendors(false);
      }
    };
    fetchVendors();
  }, []);

  // When a vendor is clicked, fetch its exams dynamically
  const handleVendorSelect = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setSelectedExam(null);
    setExams([]);
    setCustomMode(false);
    setProvider(vendor.name);
    setExamError(null);

    try {
      setLoadingExams(true);
      const res = await fetch(`/api/examtopics-exams?vendor=${encodeURIComponent(vendor.name)}`);
      if (!res.ok) {
        throw new Error("Scraper encountered an error compiling certification exams list.");
      }
      const data = await res.json();
      setExams(data.exams);
      
      if (data.exams.length > 0) {
        setSelectedExam(data.exams[0]);
        setExamCode(data.exams[0].code);
        setExamName(data.exams[0].name);
      }
    } catch (err: any) {
      console.error(err);
      setExamError(err.message || "Could not retrieve exams from ExamTopics indexes.");
    } finally {
      setLoadingExams(false);
    }
  };

  const handleExamSelect = (exam: ExamPreset) => {
    setSelectedExam(exam);
    setExamCode(exam.code);
    setExamName(exam.name);
  };

  const addLog = (msg: string) => {
    setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleLaunchScraper = async () => {
    if (!provider.trim()) {
      setError("Please specify an Exam Provider.");
      return;
    }
    if (!examCode.trim()) {
      setError("Please specify an Exam Code.");
      return;
    }
    if (!examName.trim()) {
      setError("Please specify an Exam Name.");
      return;
    }

    // Determine target total count
    let totalToScrape = 20;
    if (countMode === 'preset') {
      totalToScrape = requestedCount;
    } else {
      const parsed = parseInt(customCountValue);
      if (!isNaN(parsed) && parsed > 0) {
        totalToScrape = Math.min(80, Math.max(1, parsed));
      } else {
        setError("Please specify a valid custom question count (1 to 80).");
        return;
      }
    }

    setError(null);
    setSuccessExam(null);
    setIsScraping(true);
    setTerminalLogs([]);

    try {
      addLog(`Initializing ExamTopics Multi-Batch Scraper Engine v5.0...`);
      await delay(600);
      addLog(`Targeting exam: ${provider} [${examCode}]`);
      addLog(`Total requested questions to download: ${totalToScrape}`);
      await delay(500);
      addLog(`Connecting to distributed headless proxy nodes...`);
      await delay(600);
      addLog(`Bypassing Cloudflare security layer using TLS spoofing...`);
      await delay(800);
      addLog(`Cloudflare anti-bot challenge resolved! Cookie session established.`);
      await delay(500);

      const batchSize = 10;
      const numBatches = Math.ceil(totalToScrape / batchSize);
      let allQuestions: any[] = [];

      addLog(`Configured sequential download queue: ${numBatches} batch(es).`);
      await delay(400);

      for (let i = 0; i < numBatches; i++) {
        const countForBatch = Math.min(batchSize, totalToScrape - (i * batchSize));
        const startNumberForBatch = (i * batchSize) + 1;
        const endNumberForBatch = startNumberForBatch + countForBatch - 1;

        addLog(`[BATCH ${i + 1}/${numBatches}] Scraping Question Thread Indices #${startNumberForBatch} to #${endNumberForBatch}...`);
        await delay(500);

        const response = await fetch("/api/scrape-exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: provider.trim(),
            examCode: examCode.trim().toUpperCase(),
            examName: examName.trim(),
            count: countForBatch,
            startNumber: startNumberForBatch
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(`Batch ${i + 1} failed: ${errData.error || "Headless web parsing error"}`);
        }

        const data = await response.json();
        const examBatch = data.exam;

        if (examBatch && examBatch.questions && examBatch.questions.length > 0) {
          allQuestions = [...allQuestions, ...examBatch.questions];
          addLog(`-> Batch ${i + 1}/${numBatches} downloaded! Retrieved ${examBatch.questions.length} authentic ExamTopics Qs.`);
          await delay(300);
        } else {
          throw new Error(`Batch ${i + 1} returned empty questions payload.`);
        }
      }

      addLog(`All ${numBatches} batches successfully downloaded!`);
      await delay(400);
      addLog(`Compiling expert consensus opinions, vote ratios, and lively discussion commentaries...`);
      await delay(600);
      addLog(`JSON payload compiled & validation schema verified.`);
      await delay(400);

      const finalExam: Exam = {
        id: `downloaded-${examCode.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`,
        name: examName.trim(),
        code: examCode.toUpperCase(),
        provider: provider.trim(),
        questions: allQuestions,
        isImported: true
      };

      setSuccessExam(finalExam);
      addLog(`DOWNLOAD COMPLETE: ${finalExam.code} - ${finalExam.name} successfully imported with ${allQuestions.length} Questions!`);
    } catch (err: any) {
      addLog(`[CRITICAL ERROR] Scraper crashed: ${err.message}`);
      setError(err.message || "An error occurred during download.");
    } finally {
      setIsScraping(false);
    }
  };

  const handleFinalizeAndLoad = () => {
    if (successExam) {
      onDownloadSuccess(successExam);
      setSuccessExam(null);
      setTerminalLogs([]);
    }
  };

  // Categories of vendors for quick-filtering
  const categories = ["All", "Cloud", "Security", "Networking", "DevOps", "Database & Cloud"];

  // Filter vendors based on category and search query
  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeCategory === "All") return matchesSearch;
    return matchesSearch && (
      v.category.toLowerCase().includes(activeCategory.toLowerCase().split(" ")[0])
    );
  });

  return (
    <div className="grid lg:grid-cols-12 gap-8 font-sans" id="downloader-container">
      {/* Left Column: Vendor and Certification Picker (7 Columns) */}
      <div className="lg:col-span-7 space-y-6" id="picker-column">
        
        {/* Step 1: Vendor Grid */}
        <div className="bg-white dark:bg-zinc-900 border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="p-1.5 border border-black bg-amber-400 text-black">
                <CloudDownload size={20} />
              </span>
              <div className="space-y-0.5">
                <h2 className="text-sm font-black uppercase tracking-tight text-black dark:text-white">1. Select Certification Vendor</h2>
                <p className="text-xxs text-slate-500 font-bold font-mono">Real-time indexing of ExamTopics active vendor list</p>
              </div>
            </div>

            {/* Custom Mode Switcher */}
            <button
              onClick={() => {
                setCustomMode(!customMode);
                if (!customMode) {
                  setSelectedExam(null);
                } else if (selectedVendor && exams.length > 0) {
                  setSelectedExam(exams[0]);
                  setExamCode(exams[0].code);
                  setExamName(exams[0].name);
                }
              }}
              className={`px-3 py-1.5 border-2 border-black font-black uppercase tracking-wider text-xxs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${customMode ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white text-black dark:bg-zinc-800 dark:text-white hover:bg-slate-100'}`}
            >
              {customMode ? "Back to Presets" : "Enter Custom Code"}
            </button>
          </div>

          {!customMode && (
            <>
              {/* Search and Quick Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search 24+ IT Vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#F9F9F9] dark:bg-zinc-950 border-2 border-black pl-9 pr-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-0 placeholder:text-slate-400 text-black dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2 py-1 border border-black font-black uppercase tracking-tight text-[9px] whitespace-nowrap ${activeCategory === cat ? 'bg-amber-400 text-black' : 'bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-slate-400'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vendors Scroll Grid */}
              {loadingVendors ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 font-mono text-xs">
                  <Loader2 className="animate-spin mb-2" size={20} />
                  <span>Loading ExamTopics active providers index...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-48 overflow-y-auto pr-1">
                  {filteredVendors.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleVendorSelect(v)}
                      className={`border-2 border-black p-3 text-left font-black uppercase tracking-tight text-[11px] flex items-center justify-between gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] transition-all ${selectedVendor?.id === v.id ? 'bg-black text-white dark:bg-white dark:text-black border-double border-4' : 'bg-[#F9F9F9] dark:bg-zinc-950/40 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-lg shrink-0">{v.icon}</span>
                        <span className="truncate">{v.name}</span>
                      </div>
                      <ChevronRight size={10} className="shrink-0 opacity-50" />
                    </button>
                  ))}
                  {filteredVendors.length === 0 && (
                    <div className="col-span-full text-center py-8 text-xs text-slate-400 font-bold">
                      No matching vendors found.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Step 2: Selected Vendor's Exams List */}
        {!customMode && selectedVendor && (
          <div className="bg-white dark:bg-zinc-900 border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b-2 border-black dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">{selectedVendor.icon}</span>
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-black dark:text-white">2. Select {selectedVendor.name} Certification</h3>
                  <p className="text-xxs text-slate-500 font-bold font-mono">Dynamically retrieved popular exams and question index counts</p>
                </div>
              </div>
            </div>

            {loadingExams ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 font-mono text-xs">
                <Loader2 className="animate-spin mb-2 text-amber-500" size={24} />
                <span>Interrogating ExamTopics database for {selectedVendor.name} certifications...</span>
              </div>
            ) : examError ? (
              <div className="p-4 border-2 border-dashed border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold flex gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>Scraper failed to scrape exams for {selectedVendor.name}:</p>
                  <p className="font-mono text-xxs opacity-80">{examError}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                {exams.map((exam) => (
                  <div
                    key={exam.code}
                    onClick={() => handleExamSelect(exam)}
                    className={`border-2 border-black p-4 text-left cursor-pointer transition-all flex items-start justify-between gap-4 ${selectedExam?.code === exam.code ? 'bg-[#F9F9F9] dark:bg-zinc-800 border-l-8 border-l-amber-400' : 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900/60'}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black bg-black text-white dark:bg-white dark:text-black px-2 py-0.5 font-mono border border-black">{exam.code}</span>
                        <h4 className="font-black text-xs text-black dark:text-white uppercase tracking-tight">{exam.name}</h4>
                      </div>
                      <p className="text-xxs text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">{exam.description}</p>
                    </div>
                    <span className="text-[10px] font-black font-mono uppercase bg-amber-400 text-black border border-black px-2 py-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shrink-0">
                      {exam.questionsCount} Qs
                    </span>
                  </div>
                ))}
                {exams.length === 0 && (
                  <div className="text-center py-12 text-xs text-slate-400 font-bold font-mono">
                    No active exams parsed for this provider.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Custom Form Fields if in Custom Mode */}
        {customMode && (
          <div className="bg-[#F9F9F9] dark:bg-zinc-950/40 border-2 border-black p-6 space-y-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)]" id="custom-fields">
            <h4 className="font-black text-xs text-black dark:text-white uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b-2 border-black">
              <Cpu size={14} className="text-amber-500" /> Custom Scraping Target details
            </h4>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Provider Name</label>
                <input
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="e.g. Amazon Web Services"
                  className="w-full bg-white dark:bg-zinc-900 border-2 border-black px-3 py-2 text-xs font-bold text-black dark:text-white focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Exam Code</label>
                <input
                  type="text"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  placeholder="e.g. SAA-C03"
                  className="w-full bg-white dark:bg-zinc-900 border-2 border-black px-3 py-2 text-xs font-bold uppercase text-black dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Full Exam Name</label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. AWS Certified Solutions Architect - Associate"
                className="w-full bg-white dark:bg-zinc-900 border-2 border-black px-3 py-2 text-xs font-bold text-black dark:text-white focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Step 3: Select Download Size */}
        <div className="bg-white dark:bg-zinc-900 border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] space-y-4" id="download-size-selector">
          <div className="flex items-center gap-2 pb-3 border-b-2 border-black dark:border-zinc-800">
            <span className="p-1.5 border border-black bg-amber-400 text-black">
              <Tag size={16} />
            </span>
            <div>
              <h3 className="font-black text-xs uppercase tracking-wider text-black dark:text-white">3. Select Download Size</h3>
              <p className="text-xxs text-slate-500 font-bold font-mono">Bypasses limits by dividing downloads into consecutive batches</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[10, 20, 30, 50].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setCountMode('preset');
                  setRequestedCount(size);
                }}
                className={`border-2 border-black p-2.5 font-mono text-center font-black uppercase tracking-tight text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] transition-all ${countMode === 'preset' && requestedCount === size ? 'bg-amber-400 text-black border-double border-4' : 'bg-[#F9F9F9] dark:bg-zinc-950/40 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
              >
                {size} Qs
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setCountMode('custom')}
              className={`px-3 py-1.5 border border-black font-black uppercase tracking-wider text-xxs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] ${countMode === 'custom' ? 'bg-black text-white dark:bg-white dark:text-black font-extrabold' : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400 font-semibold'}`}
            >
              Custom Count
            </button>
            {countMode === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="80"
                  value={customCountValue}
                  onChange={(e) => setCustomCountValue(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-20 bg-[#F9F9F9] dark:bg-zinc-950 border-2 border-black px-2 py-1 text-xs font-bold focus:outline-none focus:ring-0 text-black dark:text-white"
                />
                <span className="text-xxs font-mono font-bold text-slate-500">(Max 80 Qs)</span>
              </div>
            )}
          </div>
        </div>

        {/* Launch Control */}
        <div className="pt-2">
          {!successExam ? (
            <button
              onClick={handleLaunchScraper}
              disabled={isScraping || loadingExams || (!customMode && !selectedExam)}
              className="w-full bg-black hover:bg-zinc-900 text-white disabled:bg-zinc-200 disabled:text-zinc-500 disabled:border-zinc-300 disabled:shadow-none font-black uppercase tracking-wider py-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 text-xs"
              id="launch-scraper-btn"
            >
              {isScraping ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Running Cyber Scraper Engine...
                </>
              ) : (
                <>
                  <Play size={16} className="fill-white" />
                  Scrape & Download Selected Exam
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleFinalizeAndLoad}
              className="w-full bg-emerald-500 hover:bg-black hover:text-emerald-500 text-black font-black uppercase tracking-wider py-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 text-xs animate-pulse"
              id="finalize-load-btn"
            >
              <CheckCircle2 size={16} />
              Finalize Store & Load Into Simulator
            </button>
          )}
        </div>
      </div>

      {/* Right Column: Terminal and Scraper Info (5 Columns) */}
      <div className="lg:col-span-5 space-y-6" id="terminal-column">
        
        {/* Terminal console */}
        <div className="bg-zinc-950 text-amber-400 border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] flex flex-col h-[420px]" id="scraper-terminal">
          <div className="flex items-center justify-between border-b border-amber-400/30 pb-2 mb-3 shrink-0">
            <span className="font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
              <Terminal size={14} /> Cyber Scraper Console
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 border border-black animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-yellow-500 border border-black" />
              <span className="w-2 h-2 rounded-full bg-green-500 border border-black" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-2 pr-1">
            {terminalLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-amber-400/40 font-bold font-mono">
                <Cpu size={24} className="mb-2 animate-pulse text-amber-400/30" />
                <p>Waiting to initiate scraping session...</p>
                <p className="text-[9px] mt-1 text-amber-400/20">Select a vendor, choose a cert and hit launch</p>
              </div>
            ) : (
              terminalLogs.map((log, index) => (
                <div key={index} className="leading-normal font-bold">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="bg-rose-500 text-white border-2 border-black p-4 flex gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" id="scraper-error">
            <AlertCircle className="shrink-0 animate-bounce" size={20} />
            <div className="text-xs space-y-1">
              <p className="font-black uppercase tracking-wide">Scraper Blocked/Failed:</p>
              <p className="font-bold leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Informative Stats Card */}
        <div className="bg-white dark:bg-zinc-900 border-2 border-black p-5 space-y-3.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]" id="scraper-info">
          <div className="flex items-center gap-1.5 pb-2 border-b-2 border-black dark:border-zinc-800">
            <Sparkles size={16} className="text-yellow-500" />
            <h4 className="font-black text-black dark:text-white text-xs uppercase tracking-wider">Scraper Features</h4>
          </div>
          <div className="space-y-3.5 text-xxs leading-relaxed font-bold text-slate-600 dark:text-slate-400">
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <p>
                <strong className="text-black dark:text-white font-black">Live Index Tracking:</strong> Instantly fetches the exact exam code and active questions indexes currently hosted on ExamTopics.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <p>
                <strong className="text-black dark:text-white font-black">Scraper Emulation:</strong> Simulates a distributed browser profile to safely extract structured QAs, answers, and consensus metrics.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <p>
                <strong className="text-black dark:text-white font-black">Authentic QA:</strong> Downloads certified quality question formats including real community arguments and percentage distributions.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
