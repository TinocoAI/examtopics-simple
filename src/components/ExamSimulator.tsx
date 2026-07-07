/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, ArrowRight, HelpCircle, Eye, CheckCircle2, XCircle, 
  Clock, Award, BookOpen, Bookmark, MessageSquare, Sparkles, 
  RotateCcw, Check, ListFilter, MessageCircle, RefreshCw, PenTool
} from "lucide-react";
import { Exam, Question, Comment } from "../types";

interface ExamSimulatorProps {
  exam: Exam;
  mode: 'practice' | 'exam' | 'flashcards';
  initialQuestionId?: string;
  bookmarkedIds: string[];
  onToggleBookmark: (qId: string) => void;
  onExit: () => void;
  onSaveHistory: (score: number, elapsedTime: number) => void;
}

export default function ExamSimulator({
  exam,
  mode,
  initialQuestionId,
  bookmarkedIds,
  onToggleBookmark,
  onExit,
  onSaveHistory
}: ExamSimulatorProps) {
  
  // Find index of initial question if specified
  const getInitialIndex = () => {
    if (initialQuestionId) {
      const idx = exam.questions.findIndex(q => q.id === initialQuestionId);
      if (idx !== -1) return idx;
    }
    return 0;
  };

  const [currentIdx, setCurrentIdx] = useState(getInitialIndex);
  const currentQuestion = exam.questions[currentIdx];

  // User state
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: string[] }>({});
  const [checkedQuestions, setCheckedQuestions] = useState<{ [qId: string]: boolean }>({});
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false); // Flashcard mode state
  
  // AI explanation cache and loading state
  const [aiExplanations, setAiExplanations] = useState<{ [qId: string]: string }>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null); // holds qId when loading
  const [aiError, setAiError] = useState<string | null>(null);

  // Local comments added by user during this session
  const [localComments, setLocalComments] = useState<{ [qId: string]: Comment[] }>({});
  const [commentInput, setCommentInput] = useState("");

  // Upvote trackers
  const [votedComments, setVotedComments] = useState<string[]>([]);

  // Exam timer
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start timer for Exam mode
  useEffect(() => {
    if (mode === 'exam' && !examSubmitted) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, examSubmitted]);

  // Reset flipped card when question changes in Flashcard mode
  useEffect(() => {
    setIsFlipped(false);
    setShowDiscussion(false);
    setAiError(null);
  }, [currentIdx]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Check if option is selected
  const isSelected = (optLetter: string) => {
    const answers = userAnswers[currentQuestion.id] || [];
    return answers.includes(optLetter);
  };

  // Toggle selection
  const handleSelectOption = (optLetter: string) => {
    if (checkedQuestions[currentQuestion.id] && mode === 'practice') return; // block change after checking
    if (examSubmitted) return; // block change after submit

    const isMulti = currentQuestion.correctAnswer.length > 1;
    const currentSel = userAnswers[currentQuestion.id] || [];

    if (isMulti) {
      if (currentSel.includes(optLetter)) {
        setUserAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: currentSel.filter(x => x !== optLetter)
        }));
      } else {
        setUserAnswers(prev => ({
          ...prev,
          [currentQuestion.id]: [...currentSel, optLetter]
        }));
      }
    } else {
      setUserAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: [optLetter]
      }));
    }
  };

  // Check current question answer (Practice Mode)
  const handleCheckAnswer = () => {
    setCheckedQuestions(prev => ({
      ...prev,
      [currentQuestion.id]: true
    }));
  };

  // Get explanation from Gemini AI API
  const handleGetAiExplanation = async () => {
    if (aiExplanations[currentQuestion.id]) return; // already cached
    
    setLoadingAi(currentQuestion.id);
    setAiError(null);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: currentQuestion.text,
          options: currentQuestion.options,
          correctAnswer: currentQuestion.correctAnswer,
          communityAnswer: currentQuestion.communityAnswer,
          communityVotes: currentQuestion.communityVotes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate AI explanation.");
      }

      const data = await response.json();
      setAiExplanations(prev => ({
        ...prev,
        [currentQuestion.id]: data.explanation
      }));
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Could not connect to Gemini AI explanation service. Please check your internet connection.");
    } finally {
      setLoadingAi(null);
    }
  };

  // Upvote a comment
  const handleUpvoteComment = (commentId: string) => {
    if (votedComments.includes(commentId)) return;
    setVotedComments(prev => [...prev, commentId]);
  };

  // Post notes / comment locally
  const handleAddComment = () => {
    if (!commentInput.trim()) return;

    const newComment: Comment = {
      id: `local-c-${Date.now()}`,
      username: "You (Candidate)",
      date: "Just now",
      content: commentInput.trim(),
      upvotes: 0
    };

    setLocalComments(prev => ({
      ...prev,
      [currentQuestion.id]: [...(prev[currentQuestion.id] || []), newComment]
    }));

    setCommentInput("");
  };

  // Grade the entire exam (Exam Mode)
  const handleSubmitExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Calculate total score
    let correctCount = 0;
    exam.questions.forEach(q => {
      const answers = userAnswers[q.id] || [];
      const correct = q.correctAnswer;
      // All selected must be correct, and count must match
      const isCorrect = answers.length === correct.length && answers.every(a => correct.includes(a));
      if (isCorrect) correctCount++;
    });

    const scorePct = Math.round((correctCount / exam.questions.length) * 100);
    setExamSubmitted(true);
    
    // Save to global history
    onSaveHistory(scorePct, timeElapsed);
  };

  // Determine question status for layout coloring
  const getQuestionStatus = (q: Question) => {
    const checked = checkedQuestions[q.id];
    const answers = userAnswers[q.id] || [];
    const correct = q.correctAnswer;
    const isAnswered = answers.length > 0;

    if (mode === 'practice') {
      if (!checked) return isAnswered ? 'answered' : 'unanswered';
      const isCorrect = answers.length === correct.length && answers.every(a => correct.includes(a));
      return isCorrect ? 'correct' : 'incorrect';
    } else if (mode === 'exam') {
      if (examSubmitted) {
        const isCorrect = answers.length === correct.length && answers.every(a => correct.includes(a));
        return isCorrect ? 'correct' : 'incorrect';
      }
      return isAnswered ? 'answered' : 'unanswered';
    }
    return 'unanswered';
  };

  // Render a clean markdown simulator
  const renderMarkdownExplanation = (md: string) => {
    const lines = md.split('\n');
    return lines.map((line, lIdx) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={lIdx} className="font-bold text-slate-800 dark:text-slate-100 text-sm mt-4 mb-2">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={lIdx} className="font-bold text-slate-800 dark:text-slate-100 text-base mt-5 mb-2.5 border-b border-slate-100 dark:border-slate-800 pb-1">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={lIdx} className="font-extrabold text-slate-950 dark:text-white text-lg mt-6 mb-3">{line.replace('# ', '')}</h2>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={lIdx} className="font-bold text-slate-900 dark:text-white mt-2">{line.replace(/\*\*/g, '')}</p>;
      }
      
      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const boldMatch = line.match(/\*\*(.*?)\*\*/);
        if (boldMatch) {
          const prefix = line.substring(2, line.indexOf('**'));
          const boldText = boldMatch[1];
          const suffix = line.substring(line.indexOf('**') + boldText.length + 4);
          return (
            <li key={lIdx} className="text-xs text-slate-600 dark:text-slate-300 ml-4 list-disc mt-1.5 leading-relaxed">
              {prefix}<strong>{boldText}</strong>{suffix}
            </li>
          );
        }
        return <li key={lIdx} className="text-xs text-slate-600 dark:text-slate-300 ml-4 list-disc mt-1.5 leading-relaxed">{line.substring(2)}</li>;
      }

      // Standard text with inline bolding
      if (line.trim()) {
        const boldRegex = /\*\*(.*?)\*\*/g;
        let elements = [];
        let lastIndex = 0;
        let match;
        
        while ((match = boldRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            elements.push(line.substring(lastIndex, match.index));
          }
          elements.push(<strong key={match.index} className="text-slate-900 dark:text-white font-semibold">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
        }
        if (lastIndex < line.length) {
          elements.push(line.substring(lastIndex));
        }

        return <p key={lIdx} className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{elements.length > 0 ? elements : line}</p>;
      }

      return <div key={lIdx} className="h-2" />;
    });
  };

  const currentAnswers = userAnswers[currentQuestion.id] || [];
  const currentChecked = checkedQuestions[currentQuestion.id];
  const isMultiSelect = currentQuestion.correctAnswer.length > 1;

  // Compile full comments (original + local)
  const originalDiscussion = currentQuestion.discussion || [];
  const addedComments = localComments[currentQuestion.id] || [];
  const allComments = [...originalDiscussion, ...addedComments];

  return (
    <div className="grid lg:grid-cols-4 gap-8 items-start" id="simulator-grid">
      
      {/* Sidebar: Navigation grid (Cols 1) */}
      <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border-2 border-black p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] space-y-5 lg:sticky lg:top-24" id="questions-grid-sidebar">
        
        {/* Mode & Header */}
        <div className="space-y-1.5 border-b-2 border-black dark:border-zinc-850 pb-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest font-mono text-black/50 dark:text-white/50">
              {exam.code}
            </span>
            <span className="px-2 py-0.5 border border-black text-[10px] font-black uppercase tracking-wider bg-neon-green text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] capitalize">
              {mode} Mode
            </span>
          </div>
          <h3 className="font-black text-black dark:text-white text-sm line-clamp-1 uppercase tracking-tight">
            {exam.name}
          </h3>
        </div>

        {/* Exam timer widget */}
        {mode === 'exam' && (
          <div className="flex items-center justify-between p-3 bg-[#F5F5F5] dark:bg-zinc-950 border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" id="exam-timer-widget">
            <div className="flex items-center gap-2 text-xxs font-black uppercase tracking-wider text-black dark:text-white">
              <Clock size={15} className="text-brand animate-pulse" />
              <span>Time Elapsed</span>
            </div>
            <span className="font-mono text-sm font-black text-brand">
              {formatTime(timeElapsed)}
            </span>
          </div>
        )}

        {/* Grid numbers */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-tight text-black dark:text-white">Questions Grid</span>
            <span className="text-[10px] text-black/60 dark:text-white/60 font-black font-mono">
              {currentIdx + 1} of {exam.questions.length}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1" id="grid-numbers-list">
            {exam.questions.map((q, idx) => {
              const status = getQuestionStatus(q);
              let statusClasses = "bg-white dark:bg-zinc-900 border-black dark:border-zinc-850 text-black dark:text-white hover:bg-[#F5F5F5]";
              
              if (status === 'answered') {
                statusClasses = "bg-brand text-white border-black hover:bg-black";
              } else if (status === 'correct') {
                statusClasses = "bg-neon-green text-black border-black hover:bg-black hover:text-neon-green";
              } else if (status === 'incorrect') {
                statusClasses = "bg-rose-500 text-white border-black hover:bg-black";
              }

              const isCurrent = idx === currentIdx;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`aspect-square border-2 font-mono font-black text-xs flex items-center justify-center transition-all ${statusClasses} ${isCurrent ? 'ring-2 ring-black dark:ring-offset-slate-900 scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : ''}`}
                  id={`grid-btn-${idx}`}
                >
                  {q.number}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action button for exam submit */}
        {mode === 'exam' && !examSubmitted && (
          <button
            onClick={handleSubmitExam}
            className="w-full bg-brand hover:bg-black text-white border-2 border-black font-black uppercase text-xs py-2.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            id="submit-exam-btn"
          >
            Submit Exam
          </button>
        )}

        {/* Exit button */}
        <button
          onClick={onExit}
          className="w-full border-2 border-black text-black dark:text-white bg-white dark:bg-zinc-800 hover:bg-[#F5F5F5] py-2.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          id="exit-simulator-btn"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Primary Workspace (Cols 2-4) */}
      <div className="lg:col-span-3 space-y-6" id="simulator-workspace">
        
        {/* Flashcard Flip-container or Standard Card */}
        {mode === 'flashcards' ? (
          <div className="perspective-1000 w-full" id="flashcard-viewport">
            <div 
              onClick={() => setIsFlipped(!isFlipped)}
              className={`w-full bg-white dark:bg-zinc-900 border-2 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] cursor-pointer min-h-80 flex flex-col justify-between transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180 bg-[#F5F5F5] dark:bg-zinc-950/50' : ''}`}
              id="flashcard-body"
            >
              {!isFlipped ? (
                // FRONT of Flashcard
                <div className="space-y-6 flex flex-col justify-between h-full backface-hidden" id="card-front">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start pb-2 border-b-2 border-dashed border-black/25">
                      <span className="text-xs font-black text-brand font-mono">QUESTION #{currentQuestion.number}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-black/50 dark:text-white/50">Click to reveal answer</span>
                    </div>
                    <p className="text-sm md:text-base font-bold text-black dark:text-white leading-relaxed">
                      {currentQuestion.text}
                    </p>
                  </div>
                  
                  {/* Options listed but not interactive */}
                  <div className="space-y-2 pt-4 border-t-2 border-black dark:border-zinc-850">
                    {currentQuestion.options.map((opt, oIdx) => (
                      <div key={oIdx} className="text-xs text-black/70 dark:text-white/70 flex gap-2 font-bold font-mono">
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // BACK of Flashcard
                <div className="space-y-6 flex flex-col justify-between h-full rotate-y-180 backface-hidden" id="card-back">
                  <div className="space-y-5">
                    <div className="flex justify-between items-start pb-2 border-b-2 border-dashed border-black/25">
                      <span className="text-xs font-black text-neon-green font-mono">ANSWER REVEALED</span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-black/50 dark:text-white/50">Click to flip back</span>
                    </div>

                    <div className="bg-neon-green text-black border-2 border-black p-5 space-y-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <h4 className="font-black uppercase tracking-wider text-xs">Official Correct Choice:</h4>
                      <p className="text-lg font-black font-mono">
                        Option {currentQuestion.correctAnswer.join(', ')}
                      </p>
                    </div>

                    {currentQuestion.communityAnswer && (
                      <div className="bg-white dark:bg-zinc-800 border-2 border-black p-5 space-y-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]">
                        <h4 className="font-black text-black dark:text-white uppercase tracking-wider text-xs">Community Voting Decision:</h4>
                        <p className="text-xs text-black dark:text-white font-bold font-mono">
                          {currentQuestion.communityAnswer}
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-center text-black/50 dark:text-white/50 text-[10px] font-bold uppercase tracking-wider mt-6">
                    Press &apos;Explain with Gemini&apos; or inspect &apos;Discussion Board&apos; below for explanations.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          // STANDARD Practice or Exam Mode view
          <div className="bg-white dark:bg-zinc-900 border-2 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] space-y-6 relative" id="standard-question-view">
            
            {/* Ribbon Header */}
            <div className="flex justify-between items-center pb-2 border-b-2 border-black dark:border-zinc-850">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-brand font-mono">
                  QUESTION #{currentQuestion.number}
                </span>
                {isMultiSelect && (
                  <span className="text-[9px] bg-[#FFD700] text-black font-black uppercase tracking-widest px-2 py-0.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    Select Multiple
                  </span>
                )}
              </div>
              <button 
                onClick={() => onToggleBookmark(currentQuestion.id)}
                className={`p-1.5 border-2 border-black transition-colors ${bookmarkedIds.includes(currentQuestion.id) || bookmarkedIds.includes(`${exam.id}-${currentQuestion.id}`) ? 'bg-[#FFD700] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-black dark:text-white bg-white dark:bg-zinc-800 hover:bg-[#F5F5F5]'}`}
                title="Bookmark Question"
                id="bookmark-toggle"
              >
                <Bookmark size={16} />
              </button>
            </div>

            {/* Question Text */}
            <div className="space-y-4">
              <p className="text-base md:text-lg font-bold text-black dark:text-white leading-relaxed">
                {currentQuestion.text}
              </p>
            </div>

            {/* Choices Options List */}
            <div className="space-y-3" id="choices-options-list">
              {currentQuestion.options.map((optionText, oIdx) => {
                const optLetter = optionText.trim().charAt(0).toUpperCase(); // usually 'A', 'B', etc.
                const isSel = isSelected(optLetter);
                const isCorrectAns = currentQuestion.correctAnswer.includes(optLetter);
                const isPracticeChecked = mode === 'practice' && currentChecked;
                const isReviewChecked = mode === 'exam' && examSubmitted;
                
                let cardClass = "border-black dark:border-zinc-850 bg-white hover:bg-[#F5F5F5] dark:bg-zinc-900 text-black dark:text-white";
                
                if (isSel) {
                  cardClass = "border-black bg-brand/10 dark:bg-brand/20 ring-1 ring-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]";
                }

                // If grading is revealed
                if (isPracticeChecked || isReviewChecked) {
                  if (isCorrectAns) {
                    cardClass = "border-black bg-neon-green/20 dark:bg-neon-green/10 text-black dark:text-white ring-2 ring-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
                  } else if (isSel && !isCorrectAns) {
                    cardClass = "border-black bg-rose-500/20 dark:bg-rose-500/10 text-black dark:text-white ring-2 ring-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
                  }
                }

                return (
                  <button
                    key={oIdx}
                    onClick={() => handleSelectOption(optLetter)}
                    disabled={(currentChecked && mode === 'practice') || examSubmitted}
                    className={`w-full text-left border-2 p-4 flex gap-4 items-start transition-all ${cardClass}`}
                    id={`choice-btn-${oIdx}`}
                  >
                    {/* Selector Circle or Square */}
                    <div className="mt-0.5 shrink-0">
                      {isMultiSelect ? (
                        <div className={`w-4 h-4 border-2 flex items-center justify-center text-xxs ${isSel ? 'bg-black border-black text-neon-green' : 'border-black dark:border-zinc-500'}`}>
                          {isSel && <Check size={10} />}
                        </div>
                      ) : (
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSel ? 'border-black bg-brand' : 'border-black dark:border-zinc-500'}`}>
                          {isSel && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      )}
                    </div>
                    
                    {/* Option Text */}
                    <span className="text-xs md:text-sm font-bold">
                      {optionText}
                    </span>

                    {/* Verified check icon */}
                    {(isPracticeChecked || isReviewChecked) && isCorrectAns && (
                      <CheckCircle2 size={16} className="text-neon-green shrink-0 ml-auto" />
                    )}
                    {(isPracticeChecked || isReviewChecked) && isSel && !isCorrectAns && (
                      <XCircle size={16} className="text-rose-500 shrink-0 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Answer feedback buttons (Practice Mode) */}
            {mode === 'practice' && !currentChecked && (
              <button
                onClick={handleCheckAnswer}
                disabled={currentAnswers.length === 0}
                className="w-full mt-4 bg-brand hover:bg-black text-white border-2 border-black font-black uppercase tracking-wider py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-colors flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
                id="check-answer-btn"
              >
                <Eye size={15} />
                Reveal Answer & Explanations
              </button>
            )}

            {/* Answer Revealed Section */}
            {((mode === 'practice' && currentChecked) || (mode === 'exam' && examSubmitted)) && (
              <div className="bg-[#F5F5F5] dark:bg-zinc-950/40 border-2 border-black p-6 mt-6 space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" id="answer-revealed-panel">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b-2 border-black dark:border-zinc-850 pb-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-black/50 dark:text-white/50 uppercase tracking-widest font-mono">Official Reference</p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      Correct Answer: Option <strong className="font-mono text-base">{currentQuestion.correctAnswer.join(', ')}</strong>
                    </p>
                  </div>
                  {currentQuestion.communityAnswer && (
                    <span className="px-3 py-1 border border-black bg-neon-green text-black text-xxs font-black uppercase tracking-wider">
                      Community Voted: {currentQuestion.communityAnswer}
                    </span>
                  )}
                </div>

                {/* Vote Percentage visualization if available */}
                {currentQuestion.communityVotes && (
                  <div className="space-y-2" id="voting-bars">
                    <p className="text-[10px] font-black text-black/50 dark:text-white/50 uppercase tracking-widest font-mono">Community Voting Board</p>
                    <div className="space-y-2">
                      {Object.entries(currentQuestion.communityVotes).map(([opt, pct]) => (
                        <div key={opt} className="space-y-1">
                          <div className="flex justify-between text-xxs font-black font-mono text-black dark:text-white uppercase tracking-tight">
                            <span>Option {opt}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full bg-white dark:bg-zinc-800 h-2.5 border-2 border-black overflow-hidden">
                            <div 
                              className={`h-full ${currentQuestion.correctAnswer.includes(opt) ? 'bg-neon-green' : 'bg-brand'}`} 
                              style={{ width: `${pct}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Explanation Tab (Practice Mode or Exam Reviewed Mode) */}
        {((mode === 'practice' && currentChecked) || (mode === 'exam' && examSubmitted) || mode === 'flashcards') && (
          <div className="bg-white dark:bg-zinc-900 border-2 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] space-y-4" id="ai-explainer-panel">
            <div className="flex justify-between items-center pb-2 border-b-2 border-black dark:border-zinc-850">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-brand animate-pulse" />
                <h3 className="font-black text-black dark:text-white text-xs uppercase tracking-wider">Gemini Training Assistant</h3>
              </div>
              {!aiExplanations[currentQuestion.id] && !loadingAi && (
                <button
                  onClick={handleGetAiExplanation}
                  className="bg-brand text-white hover:bg-black font-black uppercase tracking-wider px-4 py-2 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs flex items-center gap-1.5 transition-colors"
                  id="get-ai-explanation-btn"
                >
                  <Sparkles size={13} />
                  Explain with Gemini AI
                </button>
              )}
            </div>

            {/* Explanations States */}
            {loadingAi === currentQuestion.id && (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center" id="ai-loading-state">
                <RefreshCw size={24} className="text-brand animate-spin" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-tight">Consulting Certification Documents...</p>
                  <p className="text-[10px] text-black/60 dark:text-white/60 font-bold leading-relaxed">Analyzing distractors and resolving community votes. This takes 2-3 seconds.</p>
                </div>
              </div>
            )}

            {aiError && (
              <div className="p-4 bg-rose-500 text-white border-2 border-black font-black uppercase tracking-tight text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" id="ai-error-banner">
                {aiError}
              </div>
            )}

            {aiExplanations[currentQuestion.id] && (
              <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4" id="ai-explanation-content">
                <div className="prose prose-sm max-w-none prose-slate dark:prose-invert font-semibold text-black dark:text-white">
                  {renderMarkdownExplanation(aiExplanations[currentQuestion.id])}
                </div>
              </div>
            )}

            {!aiExplanations[currentQuestion.id] && !loadingAi && (
              <p className="text-xs font-bold text-black/50 dark:text-white/50 leading-relaxed">
                Need an in-depth breakdown? Click the button to have Google Gemini analyze this question, explain why each option is correct or incorrect, and resolve conflicting community votes instantly.
              </p>
            )}
          </div>
        )}

        {/* Discussion Forums Panel Tab (Always visible, but toggleable for clean view) */}
        <div className="bg-white dark:bg-zinc-900 border-2 border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] space-y-5" id="discussion-board">
          <button 
            onClick={() => setShowDiscussion(!showDiscussion)}
            className="w-full flex items-center justify-between font-black text-black dark:text-white text-xs uppercase tracking-wider text-left focus:outline-none"
            id="toggle-discussion-btn"
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-black dark:text-white" />
              <span>Discussion Board & Notes ({allComments.length})</span>
            </div>
            <span className="text-xs text-brand font-black hover:underline uppercase tracking-wider">
              {showDiscussion ? "Hide Forum" : "Open Forum"}
            </span>
          </button>

          {showDiscussion && (
            <div className="space-y-6 pt-4 border-t-2 border-black dark:border-zinc-850 animate-fade-in" id="discussion-forum-open">
              {/* Write Note / Post Note */}
              <div className="space-y-2" id="comment-composer">
                <p className="text-[10px] font-black text-black/50 dark:text-white/50 uppercase tracking-widest font-mono">Add Study Note or Reply</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Write a custom study note or community comment for this question..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                    className="flex-1 bg-[#F5F5F5] dark:bg-zinc-950 border-2 border-black text-black dark:text-white text-xs px-4 py-3 focus:outline-none"
                    id="comment-input"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!commentInput.trim()}
                    className="bg-black text-white hover:bg-neon-green hover:text-black border-2 border-black font-black uppercase px-4 py-3 text-xs transition-colors disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    id="post-comment-btn"
                  >
                    Post Note
                  </button>
                </div>
              </div>

              {/* Feed of comments */}
              <div className="space-y-4" id="comments-feed">
                {allComments.length === 0 ? (
                  <p className="text-xs text-black/50 dark:text-white/50 font-bold italic text-center py-4">No comments found. Be the first to write a study note for this question!</p>
                ) : (
                  allComments.map((comment, cIdx) => (
                    <div 
                      key={comment.id}
                      className="p-4 bg-[#F5F5F5] dark:bg-zinc-950/40 border-2 border-black space-y-2 text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      id={`comment-card-${cIdx}`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase text-black/50 dark:text-white/50 font-mono">
                        <div className="flex items-center gap-1.5 font-black text-black dark:text-white">
                          <span>{comment.username}</span>
                          {comment.vote && (
                            <span className="px-1.5 py-0.5 border border-black bg-neon-green text-black font-black font-mono text-[9px] uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                              Voted: {comment.vote}
                            </span>
                          )}
                        </div>
                        <span>{comment.date}</span>
                      </div>
                      
                      <p className="text-black/80 dark:text-white/80 font-bold leading-relaxed break-words">
                        {comment.content}
                      </p>

                      <div className="flex items-center gap-4 pt-1 text-xxs font-medium text-slate-400">
                        <button
                          onClick={() => handleUpvoteComment(comment.id)}
                          className={`flex items-center gap-1 border border-black bg-white dark:bg-zinc-800 text-black dark:text-white font-black uppercase px-2 py-1 text-[10px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all ${votedComments.includes(comment.id) ? 'bg-neon-green text-black shadow-none translate-x-[1px] translate-y-[1px]' : ''}`}
                          id={`upvote-btn-${comment.id}`}
                        >
                          <Award size={12} />
                          Helpful ({comment.upvotes + (votedComments.includes(comment.id) ? 1 : 0)})
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation bar */}
        <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]" id="simulator-footer-nav">
          <button
            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="flex items-center gap-1 border-2 border-black bg-white dark:bg-zinc-800 text-black dark:text-white font-black uppercase text-xs px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none disabled:opacity-45"
            id="prev-btn"
          >
            <ArrowLeft size={16} />
            Previous
          </button>
          
          <span className="text-[10px] font-black font-mono text-black/50 dark:text-white/50">
            Q. {currentQuestion.number} of {exam.questions.length}
          </span>

          <button
            onClick={() => setCurrentIdx(prev => Math.min(exam.questions.length - 1, prev + 1))}
            disabled={currentIdx === exam.questions.length - 1}
            className="flex items-center gap-1 border-2 border-black bg-white dark:bg-zinc-800 text-black dark:text-white font-black uppercase text-xs px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none disabled:opacity-45"
            id="next-btn"
          >
            Next
            <ArrowRight size={16} />
          </button>
        </div>

      </div>

    </div>
  );
}
