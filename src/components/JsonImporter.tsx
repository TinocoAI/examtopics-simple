/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Upload, FileJson, AlertCircle, CheckCircle2, ShieldAlert, Layers } from "lucide-react";
import { Exam, Question, Comment } from "../types";

interface JsonImporterProps {
  onImportSuccess: (importedExam: Exam) => void;
}

export default function JsonImporter({ onImportSuccess }: JsonImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  
  // Exam metadata fields
  const [examName, setExamName] = useState("");
  const [examCode, setExamCode] = useState("");
  const [examProvider, setExamProvider] = useState("Amazon Web Services");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/json" || droppedFile.name.endsWith(".json")) {
        processFile(droppedFile);
      } else {
        setError("Only JSON files are supported. Please run the scraper and upload the resulting JSON output.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setParsedData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        
        const dataArray = Array.isArray(json) ? json : (json.questions && Array.isArray(json.questions) ? json.questions : null);
        
        if (!dataArray || dataArray.length === 0) {
          throw new Error("Could not find a valid array of questions in the uploaded JSON file. File must be an array of questions or have a 'questions' array field.");
        }

        setParsedData(dataArray);
        
        // Auto-detect exam details from file name or structure if possible
        const fileNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        const words = fileNameWithoutExt.split(/[-_ ]+/);
        
        // Formulate a decent default exam name
        const inferredCode = words.find(w => /^[a-zA-Z]{2,4}\d{2,3}$/.test(w)) || "CUSTOM";
        setExamCode(inferredCode.toUpperCase());
        
        const inferredName = words
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .filter(w => !/json/i.test(w))
          .join(" ");
        setExamName(inferredName || "Imported Certification Exam");

        // Try mapping the questions to our strict schema
        const mappedQuestions = mapQuestions(dataArray, inferredCode.toLowerCase());
        setPreviewQuestions(mappedQuestions);

      } catch (err: any) {
        setError(err.message || "Failed to parse JSON file. Ensure it is a valid JSON document.");
        setFile(null);
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file. Please try again.");
      setFile(null);
    };
    reader.readAsText(selectedFile);
  };

  // Safe mapper that translates whatever keys the scraper dumped into our uniform Question type
  const mapQuestions = (rawQuestions: any[], examPrefix: string): Question[] => {
    return rawQuestions.map((q, idx) => {
      const qNum = q.number || q.id || q.question_number || (idx + 1);
      
      // 1. Detect question text
      const qText = q.text || q.question || q.questionText || q.content || q.body || "";
      if (!qText) {
        throw new Error(`Question at index ${idx} is missing its body/text content.`);
      }

      // 2. Detect options
      let rawOptions: any = q.options || q.choices || q.answers_options || q.answers || [];
      let mappedOptions: string[] = [];

      if (Array.isArray(rawOptions)) {
        mappedOptions = rawOptions.map(opt => typeof opt === 'string' ? opt : JSON.stringify(opt));
      } else if (typeof rawOptions === 'object' && rawOptions !== null) {
        // Map dictionary like {"A": "First choice", "B": "Second choice"}
        mappedOptions = Object.entries(rawOptions).map(([key, val]) => `${key}. ${val}`);
      }

      // If options are missing but present in the text, we might try parsing, but standard scraper has options.
      if (mappedOptions.length === 0) {
        // Fallback or warning
        mappedOptions = ["A. Option A", "B. Option B", "C. Option C", "D. Option D"];
      }

      // 3. Detect correct answer
      let rawAns: any = q.correct_answer || q.correctAnswer || q.answer || q.solution || [];
      let mappedCorrectAnswer: string[] = [];

      if (Array.isArray(rawAns)) {
        mappedCorrectAnswer = rawAns.map(a => String(a).trim().toUpperCase());
      } else if (typeof rawAns === 'string') {
        // Split strings like "A, B" or "A B" or "A"
        mappedCorrectAnswer = rawAns
          .split(/[\s,]+/)
          .map(a => a.trim().toUpperCase())
          .filter(a => a.length === 1 && /^[A-Z]$/.test(a));
      }

      if (mappedCorrectAnswer.length === 0) {
        // Fallback to "A" if not found
        mappedCorrectAnswer = ["A"];
      }

      // 4. Parse community answer/votes
      const communityAnswer = q.community_answer || q.communityAnswer || q.most_voted || undefined;
      let communityVotes = q.community_votes || q.communityVotes || q.votes || undefined;

      if (communityVotes && typeof communityVotes === 'string') {
        try {
          communityVotes = JSON.parse(communityVotes);
        } catch {
          communityVotes = undefined;
        }
      }

      // 5. Detect discussions/comments
      let rawDiscussion = q.discussion || q.comments || q.threads || [];
      let mappedDiscussion: Comment[] = [];

      if (Array.isArray(rawDiscussion)) {
        mappedDiscussion = rawDiscussion.map((comment, cIdx) => ({
          id: comment.id || `${examPrefix}-q${qNum}-c${cIdx}`,
          username: comment.username || comment.user || comment.author || `User_${Math.floor(Math.random() * 10000)}`,
          date: comment.date || comment.time || "Some time ago",
          vote: comment.vote || comment.voted_option || undefined,
          content: comment.content || comment.comment || comment.text || "",
          upvotes: Number(comment.upvotes || comment.likes || comment.votes_count || 0)
        })).filter(c => c.content.length > 0);
      }

      return {
        id: `${examPrefix}-q${qNum}-${Math.random().toString(36).substring(2, 7)}`,
        number: qNum,
        text: qText,
        options: mappedOptions,
        correctAnswer: mappedCorrectAnswer,
        communityAnswer,
        communityVotes,
        discussion: mappedDiscussion.length > 0 ? mappedDiscussion : undefined
      };
    });
  };

  const handleImportSubmit = () => {
    if (!examName.trim()) {
      setError("Please provide an Exam Name before importing.");
      return;
    }
    if (!examCode.trim()) {
      setError("Please provide an Exam Code (e.g. SAA-C03, AZ-900).");
      return;
    }

    const newExam: Exam = {
      id: `imported-${examCode.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`,
      name: examName.trim(),
      code: examCode.trim().toUpperCase(),
      provider: examProvider,
      questions: previewQuestions,
      isImported: true
    };

    onImportSuccess(newExam);
    
    // Reset form
    setFile(null);
    setParsedData(null);
    setPreviewQuestions([]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8" id="importer-container">
      {/* File Dropzone */}
      {!file ? (
        <div 
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-black hover:bg-neon-green/10 p-10 text-center cursor-pointer bg-white dark:bg-zinc-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] transition-colors group relative"
          id="dropzone"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            className="hidden" 
          />
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 border-2 border-black bg-brand text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:scale-105 transition-transform">
              <Upload size={32} />
            </div>
            <div className="space-y-1">
              <p className="font-black text-black dark:text-white text-lg uppercase tracking-tight">
                Drag & drop your ExamTopics JSON file
              </p>
              <p className="text-sm text-black/60 dark:text-white/60 font-bold">
                or click to browse from your computer
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono font-black text-black bg-neon-green border-2 border-black px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] mt-2">
              <FileJson size={13} />
              Compatible with arvind88765 Scraper Output
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] space-y-6" id="parsing-configuration">
          {/* File Selected Badge */}
          <div className="flex items-center justify-between border-b-2 border-black dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 border-2 border-black bg-neon-green text-black">
                <CheckCircle2 size={20} />
              </div>
              <div className="space-y-0.5">
                <p className="font-black text-black dark:text-white text-sm truncate max-w-md uppercase">
                  {file.name}
                </p>
                <p className="text-xs text-black/60 dark:text-white/60 font-bold">
                  Size: {(file.size / 1024).toFixed(1)} KB • Detected <strong className="font-black">{previewQuestions.length}</strong> questions
                </p>
              </div>
            </div>
            <button 
              onClick={() => { setFile(null); setParsedData(null); setPreviewQuestions([]); setError(null); }}
              className="text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-black px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              id="change-file-btn"
            >
              Remove
            </button>
          </div>

          {/* Configuration Form */}
          <div className="space-y-4" id="metadata-form">
            <h3 className="font-black text-black dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span className="p-1 border border-black bg-brand text-white">
                <Layers size={14} />
              </span>
              Configure Exam Metadata
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">Exam Provider</label>
                <select
                  value={examProvider}
                  onChange={(e) => setExamProvider(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-zinc-950 border-2 border-black px-3 py-2.5 text-xs font-black uppercase tracking-wider text-black dark:text-white focus:outline-none"
                  id="select-provider"
                >
                  <option value="Amazon Web Services">Amazon Web Services (AWS)</option>
                  <option value="Google Cloud">Google Cloud (GCP)</option>
                  <option value="Microsoft Azure">Microsoft Azure</option>
                  <option value="Salesforce">Salesforce</option>
                  <option value="CompTIA">CompTIA</option>
                  <option value="Cisco">Cisco</option>
                  <option value="Other Provider">Other Provider</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">Exam Code</label>
                <input
                  type="text"
                  placeholder="e.g. SAA-C03, AZ-900"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  className="w-full bg-[#F5F5F5] dark:bg-zinc-950 border-2 border-black px-3 py-2.5 text-xs font-bold text-black dark:text-white focus:outline-none"
                  id="input-code"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-black/60 dark:text-white/60">Exam Name</label>
              <input
                type="text"
                placeholder="e.g. AWS Certified Solutions Architect - Associate"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className="w-full bg-[#F5F5F5] dark:bg-zinc-950 border-2 border-black px-3 py-2.5 text-xs font-bold text-black dark:text-white focus:outline-none"
                id="input-name"
              />
            </div>
          </div>

          {/* Import Button */}
          <button
            onClick={handleImportSubmit}
            className="w-full bg-brand hover:bg-black text-white font-black uppercase tracking-wider py-3.5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all flex items-center justify-center gap-2 text-xs"
            id="finalize-import-btn"
          >
            <CheckCircle2 size={16} />
            Complete Import and Load to Simulator
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-rose-500 text-white border-2 border-black p-4 flex gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" id="import-error-banner">
          <AlertCircle className="shrink-0" size={20} />
          <p className="text-sm font-black uppercase tracking-tight">{error}</p>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-black p-5 space-y-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]" id="importer-tips-section">
        <h4 className="font-black text-black dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
          <ShieldAlert size={14} className="text-brand" />
          Pro Importer Tips
        </h4>
        <ul className="text-xs text-black/65 dark:text-white/65 list-disc list-inside space-y-1.5 font-bold leading-relaxed">
          <li>You can practice fully offline once the JSON is loaded.</li>
          <li>Imports are automatically saved to your browser&apos;s <strong className="font-black">localStorage</strong> so they persist next time you open the app.</li>
          <li>Make sure to follow our <strong className="font-black">Scraper Companion Guide</strong> to generate compatible JSON files easily.</li>
        </ul>
      </div>
    </div>
  );
}
