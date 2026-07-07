/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exam, PracticeHistory } from "../types";
import { BookOpen, Trophy, Clock, CheckCircle, BarChart3, Trash2, Layers, Tag, Bookmark, FileDown } from "lucide-react";

interface DashboardProps {
  exams: Exam[];
  history: PracticeHistory[];
  bookmarkedIds: string[];
  onSelectExam: (exam: Exam, mode: 'practice' | 'exam' | 'flashcards') => void;
  onDeleteExam: (examId: string) => void;
  onClearHistory: () => void;
  onSelectBookmark: (examId: string, qId: string) => void;
}

export default function Dashboard({
  exams,
  history,
  bookmarkedIds,
  onSelectExam,
  onDeleteExam,
  onClearHistory,
  onSelectBookmark
}: DashboardProps) {
  
  // Calculate stats
  const totalExams = exams.length;
  const totalQuestions = exams.reduce((sum, e) => sum + e.questions.length, 0);
  const totalAttempts = history.length;
  
  const averageScore = totalAttempts > 0 
    ? Math.round(history.reduce((sum, h) => sum + h.score, 0) / totalAttempts) 
    : 0;
    
  const totalTimeSec = history.reduce((sum, h) => sum + h.elapsedTime, 0);
  const formattedTotalTime = totalTimeSec > 3600
    ? `${Math.floor(totalTimeSec / 3600)}h ${Math.floor((totalTimeSec % 3600) / 60)}m`
    : `${Math.floor(totalTimeSec / 60)}m ${totalTimeSec % 60}s`;
  
  // Export exam to JSON file (download)
  const handleExportExam = (exam: Exam) => {
    try {
      // Convert exam to JSON string with pretty formatting
      const jsonStr = JSON.stringify(exam, null, 2);
      
      // Create blob and download link
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exam.code.replace(/[^a-zA-Z0-9]/g, '_')}_${exam.provider.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLog?.(`Exported ${exam.code} to JSON file.`);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Failed to export exam: ' + err.message);
    }
  };
  
  // Group bookmarks by exam for list display
  const bookmarkedQuestionsList = bookmarkedIds.map(bId => {
    // bId is format "examId-qId" or just "examId:qId"
    // Let's look up the actual question
    for (const exam of exams) {
      const q = exam.questions.find(quest => quest.id === bId || `${exam.id}-${quest.id}` === bId);
      if (q) {
        return {
          examId: exam.id,
          examCode: exam.code,
          questionId: q.id,
          questionNumber: q.number,
          questionText: q.text
        };
      }
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="space-y-8" id="dashboard-container">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" id="stats-grid">
        <div className="bg-white dark:bg-zinc-900 border-2 border-black p-5 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]" id="stat-exams">
          <div className="p-3 border-2 border-black bg-brand text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Layers size={20} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-black/50 dark:text-white/50">Exams Loaded</p>
            <p className="text-2xl font-black text-black dark:text-white font-mono">{totalExams}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-black p-5 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]" id="stat-questions">
          <div className="p-3 border-2 border-black bg-neon-green text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <BookOpen size={20} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-black/50 dark:text-white/50">Total Questions</p>
            <p className="text-2xl font-black text-black dark:text-white font-mono">{totalQuestions}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-black p-5 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]" id="stat-attempts">
          <div className="p-3 border-2 border-black bg-black text-white dark:bg-white dark:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <CheckCircle size={20} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-black/50 dark:text-white/50">Practice Runs</p>
            <p className="text-2xl font-black text-black dark:text-white font-mono">{totalAttempts}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-black p-5 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]" id="stat-accuracy">
          <div className="p-3 border-2 border-black bg-[#FFD700] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Trophy size={20} />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-black/50 dark:text-white/50">Avg. Accuracy</p>
            <p className="text-2xl font-black text-black dark:text-white font-mono">{averageScore}%</p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border-2 border-black p-5 flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] col-span-2 lg:col-span-1" id="stat-time">
          <div className="p-3 border-2 border-black bg-cyan-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Clock size={20} />
          </div>
          <div className="space-y-0.5 overflow-hidden">
            <p className="text-[10px] font-black uppercase tracking-wider text-black/50 dark:text-white/50">Practice Time</p>
            <p className="text-lg font-black text-black dark:text-white font-mono truncate">{formattedTotalTime}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Exams List & Sidebar */}
      <div className="grid lg:grid-cols-3 gap-8" id="dashboard-main-grid">
        {/* Exams List Section */}
        <div className="lg:col-span-2 space-y-6" id="exams-list-section">
          <h2 className="text-lg font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-2">
            <span className="p-1 border border-black bg-neon-green text-black">
              <BookOpen size={16} />
            </span>
            Available Certifications
          </h2>

          <div className="grid gap-6" id="exams-grid">
            {exams.map(exam => (
              <div 
                key={exam.id}
                className="bg-white dark:bg-zinc-900 border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] flex flex-col md:flex-row justify-between md:items-center gap-6 relative group"
                id={`exam-card-${exam.id}`}
              >
                {/* Delete button for imported */}
                {exam.isImported && (
                  <button 
                    onClick={() => onDeleteExam(exam.id)}
                    className="absolute right-4 top-4 p-1.5 border border-black bg-rose-500 text-white hover:bg-black transition-colors"
                    title="Delete Imported Exam"
                    id={`delete-exam-${exam.id}`}
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                {/* Left side: Metadata */}
                <div className="space-y-4 max-w-md">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="px-2.5 py-1 border-2 border-black bg-black text-white text-xs font-mono font-black uppercase tracking-wider shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      {exam.code}
                    </span>
                    <span className="px-2.5 py-1 border-2 border-black bg-neon-green text-black text-xs font-mono font-black uppercase tracking-wider shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      {exam.provider}
                    </span>
                    {exam.isImported && (
                      <span className="px-2.5 py-1 border-2 border-black bg-brand text-white text-xs font-mono font-black uppercase tracking-wider shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        Imported
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-black dark:text-white text-lg uppercase leading-tight tracking-tight">
                      {exam.name}
                    </h3>
                    <p className="text-xs text-black/65 dark:text-white/65 mt-1 font-medium leading-relaxed">
                      Contains <strong className="font-black">{exam.questions.length}</strong> certification practice questions with community forums and answers.
                    </p>
                  </div>
                </div>

                {/* Right side: Launchers */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 md:justify-end" id={`launchers-${exam.id}`}>
                  <button
                    onClick={() => onSelectExam(exam, 'practice')}
                    className="bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-black dark:text-white border-2 border-black font-black uppercase text-xs tracking-wider py-2 px-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                    id={`practice-btn-${exam.id}`}
                  >
                    Practice Mode
                  </button>
                  <button
                    onClick={() => onSelectExam(exam, 'exam')}
                    className="bg-brand text-white hover:bg-black transition-colors border-2 border-black font-black uppercase text-xs tracking-wider py-2 px-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    id={`exam-btn-${exam.id}`}
                  >
                    Exam Mode (Timed)
                  </button>
                  <button
                    onClick={() => onSelectExam(exam, 'flashcards')}
                    className="bg-neon-green hover:bg-black hover:text-neon-green text-black transition-colors border-2 border-black font-black uppercase text-xs tracking-wider py-2 px-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    id={`flash-btn-${exam.id}`}
                  >
                    Flashcards
                  </button>
                  <button
                    onClick={() => handleExportExam(exam)}
                    className="bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-black dark:text-white border-2 border-black font-black uppercase text-xs tracking-wider py-2 px-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1"
                    id={`export-btn-${exam.id}`}
                  >
                    <FileDown size={14} />
                    Export
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Sections */}
        <div className="space-y-6" id="dashboard-sidebar">
          {/* Recent History Feed */}
          <div className="bg-white dark:bg-zinc-900 border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] space-y-4" id="recent-history-section">
            <div className="flex justify-between items-center pb-2 border-b-2 border-black dark:border-zinc-800">
              <h3 className="font-black text-black dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="text-black dark:text-white" size={16} />
                Recent Activity
              </h3>
              {history.length > 0 && (
                <button 
                  onClick={onClearHistory}
                  className="text-[10px] border border-black bg-rose-500 text-white px-2 py-0.5 font-black uppercase tracking-tight"
                  id="clear-history-btn"
                >
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-6 space-y-2 border-2 border-dashed border-black/40 dark:border-white/20 p-4 bg-[#F5F5F5] dark:bg-zinc-950/40" id="no-history-state">
                <p className="text-xs font-bold text-black/60 dark:text-white/60">No attempts completed yet.</p>
                <p className="text-[10px] text-black/50 dark:text-white/50 leading-relaxed">Complete an Exam Mode run to see statistics and accuracy logging here!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto" id="history-feed-list">
                {history.map(item => {
                  const itemTime = item.elapsedTime > 60 
                    ? `${Math.floor(item.elapsedTime / 60)}m`
                    : `${item.elapsedTime}s`;
                  return (
                    <div 
                      key={item.id}
                      className="p-3 bg-[#F5F5F5] dark:bg-zinc-950/40 border border-black dark:border-zinc-800 flex items-center justify-between gap-3 text-xs"
                      id={`history-item-${item.id}`}
                    >
                      <div className="space-y-1 truncate max-w-[70%]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-black dark:text-white font-mono text-[10px]">
                            {item.examCode}
                          </span>
                          <span className="text-black/45">•</span>
                          <span className="text-[10px] font-black uppercase tracking-wider text-black bg-neon-green border border-black px-1.5 py-0.2 select-none">
                            {item.mode}
                          </span>
                        </div>
                        <p className="text-black/50 dark:text-white/50 text-[10px] font-mono">
                          {new Date(item.date).toLocaleDateString()} • {itemTime} elapsed
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-black font-mono ${item.score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                          {item.score}%
                        </p>
                        <p className="text-black/50 dark:text-white/50 text-[10px] font-bold font-mono">
                          {Math.round((item.score / 100) * item.totalQuestions)}/{item.totalQuestions}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bookmarks Quickjump */}
          <div className="bg-white dark:bg-zinc-900 border-2 border-black p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] space-y-4" id="bookmarks-section">
            <h3 className="font-black text-black dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b-2 border-black dark:border-zinc-800">
              <Bookmark className="text-[#FFD700]" size={16} />
              Bookmarks ({bookmarkedQuestionsList.length})
            </h3>

            {bookmarkedQuestionsList.length === 0 ? (
              <div className="text-center py-6 text-xs font-bold text-black/50 dark:text-white/50 border-2 border-dashed border-black/40 dark:border-white/20 p-4 bg-[#F5F5F5] dark:bg-zinc-950/40" id="no-bookmarks-state">
                No questions bookmarked yet. Click the bookmark ribbon inside any question to save it!
              </div>
            ) : (
              <div className="space-y-3.5 max-h-72 overflow-y-auto" id="bookmarks-list">
                {bookmarkedQuestionsList.map(item => item && (
                  <button
                    key={`${item.examId}-${item.questionId}`}
                    onClick={() => onSelectBookmark(item.examId, item.questionId)}
                    className="w-full text-left p-3 hover:bg-[#F5F5F5] dark:hover:bg-zinc-950/40 transition-colors border border-black dark:border-zinc-800 flex gap-2.5 items-start text-xs group"
                    id={`bookmark-btn-${item.questionId}`}
                  >
                    <Tag className="text-black dark:text-white group-hover:text-brand shrink-0 mt-0.5" size={13} />
                    <div className="space-y-0.5 truncate">
                      <p className="font-black text-black dark:text-white font-mono text-[10px]">
                        {item.examCode} • Q#{item.questionNumber}
                      </p>
                      <p className="text-black/50 dark:text-white/50 text-[10px] font-bold truncate">
                        {item.questionText}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
