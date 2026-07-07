/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  BookOpen, Terminal, FileJson, Sun, Moon, Info, ShieldAlert,
  ChevronRight, RefreshCw, BarChart2, Layers, Compass, HelpCircle,
  CloudDownload, GitBranch
} from "lucide-react";
import { Exam, PracticeHistory } from "./types";
import { SAMPLE_EXAMS } from "./data/sampleExams";

// Sub-components
import Dashboard from "./components/Dashboard";
import JsonImporter from "./components/JsonImporter";
import ScraperGuide from "./components/ScraperGuide";
import ExamSimulator from "./components/ExamSimulator";
import ExamDownloader from "./components/ExamDownloader";
import VersionPicker from "./components/VersionPicker";

export default function App() {
  // Navigation & View tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'importer' | 'guide' | 'downloader' | 'versions'>('dashboard');
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load state from local storage or defaults
  const [exams, setExams] = useState<Exam[]>(SAMPLE_EXAMS);
  const [history, setHistory] = useState<PracticeHistory[]>([]);
  const [bookmarkedQuestionIds, setBookmarkedQuestionIds] = useState<string[]>([]);

  // Simulation active state
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [simulationMode, setSimulationMode] = useState<'practice' | 'exam' | 'flashcards' | null>(null);
  const [initialQuestionId, setInitialQuestionId] = useState<string | undefined>(undefined);

  // Sync state with LocalStorage on mount
  useEffect(() => {
    try {
      // 1. Theme
      const savedTheme = localStorage.getItem("examtopics_theme");
      if (savedTheme === "dark") {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      } else {
        setTheme("light");
        document.documentElement.classList.remove("dark");
      }

      // 2. Imported Exams
      const savedExamsRaw = localStorage.getItem("examtopics_imported_exams");
      if (savedExamsRaw) {
        const importedExams: Exam[] = JSON.parse(savedExamsRaw);
        // Merge with preloaded sample exams
        setExams([...SAMPLE_EXAMS, ...importedExams]);
      }

      // 3. History
      const savedHistoryRaw = localStorage.getItem("examtopics_practice_history");
      if (savedHistoryRaw) {
        setHistory(JSON.parse(savedHistoryRaw));
      }

      // 4. Bookmarks
      const savedBookmarksRaw = localStorage.getItem("examtopics_bookmarks");
      if (savedBookmarksRaw) {
        setBookmarkedQuestionIds(JSON.parse(savedBookmarksRaw));
      }
    } catch (err) {
      console.error("Failed to restore state from localStorage:", err);
    }
  }, []);

  // Theme toggle
  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
      localStorage.setItem("examtopics_theme", "dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("examtopics_theme", "light");
    }
  };

  // Callback: Import Success
  const handleImportSuccess = (newExam: Exam) => {
    try {
      const currentImportedRaw = localStorage.getItem("examtopics_imported_exams");
      let currentImported: Exam[] = [];
      if (currentImportedRaw) {
        currentImported = JSON.parse(currentImportedRaw);
      }
      
      const updatedImported = [newExam, ...currentImported];
      localStorage.setItem("examtopics_imported_exams", JSON.stringify(updatedImported));
      
      // Update app state
      setExams([...SAMPLE_EXAMS, ...updatedImported]);
      setActiveTab("dashboard");
    } catch (err) {
      console.error("Failed to persist imported exam:", err);
    }
  };

  // Callback: Delete Exam
  const handleDeleteExam = (examId: string) => {
    try {
      const currentImportedRaw = localStorage.getItem("examtopics_imported_exams");
      if (currentImportedRaw) {
        const currentImported: Exam[] = JSON.parse(currentImportedRaw);
        const filtered = currentImported.filter(e => e.id !== examId);
        localStorage.setItem("examtopics_imported_exams", JSON.stringify(filtered));
        setExams([...SAMPLE_EXAMS, ...filtered]);
      }
    } catch (err) {
      console.error("Failed to delete imported exam:", err);
    }
  };

  // Callback: Toggle Bookmark
  const handleToggleBookmark = (qId: string) => {
    try {
      // Create direct reference including exam code/id if needed, but qId is already unique.
      // To ensure no collision across different exams, we store both or keep qId as unique
      let updated: string[];
      if (bookmarkedQuestionIds.includes(qId)) {
        updated = bookmarkedQuestionIds.filter(id => id !== qId);
      } else {
        updated = [...bookmarkedQuestionIds, qId];
      }
      setBookmarkedQuestionIds(updated);
      localStorage.setItem("examtopics_bookmarks", JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to save bookmark:", err);
    }
  };

  // Callback: Clear History
  const handleClearHistory = () => {
    try {
      localStorage.removeItem("examtopics_practice_history");
      setHistory([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  // Callback: Select Exam from Dashboard
  const handleSelectExam = (exam: Exam, mode: 'practice' | 'exam' | 'flashcards') => {
    setSelectedExam(exam);
    setSimulationMode(mode);
    setInitialQuestionId(undefined); // start from beginning
  };

  // Callback: Select Bookmarked Question directly
  const handleSelectBookmark = (examId: string, qId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (exam) {
      setSelectedExam(exam);
      setSimulationMode('practice');
      setInitialQuestionId(qId);
    }
  };

  // Callback: Save Practice Run History
  const handleSaveHistory = (score: number, elapsedTime: number) => {
    if (!selectedExam) return;

    try {
      const newHistoryItem: PracticeHistory = {
        id: `h-${Date.now()}`,
        examId: selectedExam.id,
        examName: selectedExam.name,
        examCode: selectedExam.code,
        date: new Date().toISOString(),
        score,
        totalQuestions: selectedExam.questions.length,
        elapsedTime,
        mode: simulationMode === 'exam' ? 'exam' : 'practice'
      };

      const updatedHistory = [newHistoryItem, ...history];
      setHistory(updatedHistory);
      localStorage.setItem("examtopics_practice_history", JSON.stringify(updatedHistory));
    } catch (err) {
      console.error("Failed to save history score:", err);
    }
  };

  // Handle closing simulator
  const handleExitSimulator = () => {
    setSelectedExam(null);
    setSimulationMode(null);
    setInitialQuestionId(undefined);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-zinc-950 font-sans text-black dark:text-white flex flex-col transition-colors duration-200 border-[8px] md:border-[16px] border-black dark:border-zinc-850">
      
      {/* Navigation Header */}
      <header className="bg-white dark:bg-zinc-900 border-b-4 border-black dark:border-zinc-850 sticky top-0 z-50" id="main-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo and App Title */}
            <button 
              onClick={handleExitSimulator}
              className="flex items-center gap-3 cursor-pointer group text-left"
              id="header-logo-btn"
            >
              <div className="p-2 border-2 border-black bg-brand text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none transition-all">
                <BookOpen size={20} />
              </div>
              <div className="space-y-0.5">
                <h1 className="font-black text-black dark:text-white text-lg tracking-tighter uppercase leading-none">
                  ExamTopics <span className="text-brand">Simulator</span>
                </h1>
                <p className="text-black/50 dark:text-white/50 text-[10px] font-bold font-mono tracking-widest uppercase">
                  Companion
                </p>
              </div>
            </button>

            {/* Middle Nav: Show tabs ONLY if simulator is inactive */}
            {!selectedExam && (
              <nav className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-950 p-1 border-2 border-black dark:border-zinc-800" id="header-nav-tabs">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${activeTab === 'dashboard' ? 'bg-neon-green text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'}`}
                  id="tab-dashboard"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('downloader')}
                  className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'downloader' ? 'bg-amber-400 text-black border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'}`}
                  id="tab-downloader"
                >
                  <CloudDownload size={13} />
                  Download Exams
                </button>
                <button
                  onClick={() => setActiveTab('importer')}
                  className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'importer' ? 'bg-brand text-white border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'}`}
                  id="tab-importer"
                >
                  <FileJson size={13} />
                  JSON Importer
                </button>
                <button
                  onClick={() => setActiveTab('guide')}
                  className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'guide' ? 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'}`}
                  id="tab-guide"
                >
                  <Terminal size={13} />
                  Scraper Guide
                </button>
                <button
                  onClick={() => setActiveTab('versions')}
                  className={`px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'versions' ? 'bg-purple-600 text-white border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'}`}
                  id="tab-versions"
                >
                  <GitBranch size={13} />
                  Versions
                </button>
              </nav>
            )}

            {/* Right side controls */}
            <div className="flex items-center gap-3">
              {/* Dark/Light mode toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 border-2 border-black dark:border-zinc-800 hover:bg-neon-green hover:text-black transition-colors"
                title="Toggle visual theme"
                id="theme-toggle"
              >
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </button>

              {/* Quick info if simulator is active */}
              {selectedExam && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-black bg-neon-green border-2 border-black px-3 py-1.5 font-bold font-mono shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" id="header-simulator-badge">
                  <span className="font-black uppercase">{selectedExam.code}</span>
                  <span>•</span>
                  <span className="capitalize">{simulationMode} Mode</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="main-content">
        
        {/* If Simulator is ACTIVE, render the simulator workspace */}
        {selectedExam && simulationMode ? (
          <div className="space-y-6">
            
            {/* Breadcrumb row */}
            <div className="flex items-center justify-between text-xs border-2 border-black bg-white dark:bg-zinc-900 p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.15)]" id="simulator-breadcrumb">
              <button 
                onClick={handleExitSimulator}
                className="flex items-center gap-1 text-black dark:text-white hover:text-brand font-black uppercase tracking-tight"
                id="back-breadcrumb-btn"
              >
                <ChevronRight size={14} className="rotate-180" />
                Exit practicing {selectedExam.code}
              </button>

              <div className="flex items-center gap-1 text-black/65 dark:text-white/65 font-bold font-mono text-xxs uppercase">
                <span>{selectedExam.code}</span>
                <ChevronRight size={10} />
                <span className="text-brand font-black">{simulationMode} Mode</span>
              </div>
            </div>

            {/* Active simulator */}
            <ExamSimulator
              exam={selectedExam}
              mode={simulationMode}
              initialQuestionId={initialQuestionId}
              bookmarkedIds={bookmarkedQuestionIds}
              onToggleBookmark={handleToggleBookmark}
              onExit={handleExitSimulator}
              onSaveHistory={handleSaveHistory}
            />
          </div>
        ) : (
          /* Render the standard selected navigation Tab */
          <div className="space-y-6" id="tab-viewport">
            
            {/* Mobile Tab bar selection */}
            <div className="md:hidden flex bg-slate-100 dark:bg-zinc-900 p-1 border-2 border-black" id="mobile-tabs-selector">
              <button 
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase ${activeTab === 'dashboard' ? 'bg-neon-green text-black border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-500'}`}
              >
                Exams
              </button>
              <button 
                onClick={() => setActiveTab('downloader')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase ${activeTab === 'downloader' ? 'bg-amber-400 text-black border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-500'}`}
              >
                Download
              </button>
              <button 
                onClick={() => setActiveTab('importer')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase ${activeTab === 'importer' ? 'bg-brand text-white border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-500'}`}
              >
                Import
              </button>
              <button 
                onClick={() => setActiveTab('guide')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase ${activeTab === 'guide' ? 'bg-black text-white border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-500'}`}
              >
                Guide
              </button>
              <button 
                onClick={() => setActiveTab('versions')}
                className={`flex-1 py-2 text-center text-xs font-black uppercase ${activeTab === 'versions' ? 'bg-purple-600 text-white border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-500'}`}
              >
                Versions
              </button>
            </div>

            {activeTab === 'dashboard' && (
              <Dashboard 
                exams={exams}
                history={history}
                bookmarkedIds={bookmarkedQuestionIds}
                onSelectExam={handleSelectExam}
                onDeleteExam={handleDeleteExam}
                onClearHistory={handleClearHistory}
                onSelectBookmark={handleSelectBookmark}
              />
            )}

            {activeTab === 'downloader' && (
              <ExamDownloader 
                onDownloadSuccess={handleImportSuccess}
              />
            )}

            {activeTab === 'importer' && (
              <JsonImporter 
                onImportSuccess={handleImportSuccess}
              />
            )}

            {activeTab === 'guide' && (
              <ScraperGuide />
            )}

            {activeTab === 'versions' && (
              <VersionPicker />
            )}
          </div>
        )}
      </main>

      {/* Humble Footer */}
      <footer className="bg-white dark:bg-zinc-900 border-t-4 border-black dark:border-zinc-850 py-6 mt-12 text-center text-xs font-mono font-bold uppercase tracking-wider text-black dark:text-white" id="main-footer">
        <p>© 2026 ExamTopics Companion & Practice Simulator</p>
      </footer>

    </div>
  );
}
