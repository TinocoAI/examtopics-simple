/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Terminal, Copy, Check, FileCode, Play, AlertTriangle, BookOpen } from "lucide-react";

export default function ScraperGuide() {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const steps = [
    {
      title: "1. Clone the Scraper Repository",
      description: "Clone the official `examtopics-scraper` repository locally to your computer.",
      code: "git clone https://github.com/arvind88765/examtopics-scraper.git\ncd examtopics-scraper",
      id: "clone"
    },
    {
      title: "2. Install Python Dependencies",
      description: "Ensure you have Python 3.8+ installed, then install the required dependencies including Playwright (for scraping JavaScript-rendered content) and Camoufox (for anti-fingerprint emulation).",
      code: "pip install -r requirements.txt\nplaywright install firefox",
      id: "install"
    },
    {
      title: "3. Run the Scraper Command",
      description: "Locate your target exam on ExamTopics (e.g., AWS SAA-C03 or Google Cloud Architect) and copy the discussion list URL. Run the Python script specifying the exam URL and the number of pages you wish to scrape.",
      code: "python main.py -u \"https://www.examtopics.com/discussions/amazon/1/\" -p 5",
      id: "run"
    }
  ];

  const sampleJsonOutput = `[
  {
    "number": 1,
    "text": "A company wants to migrate an on-premises database...",
    "options": [
      "A. Set up AWS Direct Connect...",
      "B. Use an AWS Snowball Edge...",
      "C. Compress the database files...",
      "D. Set up an IPsec VPN..."
    ],
    "correct_answer": ["B"],
    "community_answer": "B",
    "community_votes": { "B": 100 },
    "discussion": [
      {
        "username": "CloudNinja99",
        "date": "3 months ago",
        "vote": "B",
        "content": "Definitely B. With a 100 Mbps internet connection..."
      }
    ]
  }
]`;

  return (
    <div className="space-y-8 max-w-4xl mx-auto" id="scraper-guide-container">
      {/* Hero Header */}
      <div className="bg-zinc-950 text-white border-4 border-black p-8 relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)]" id="guide-hero">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-white bg-brand text-white text-xs font-black uppercase tracking-wider">
              <BookOpen size={13} />
              Companion Tutorial
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight">How to scrape & import exams</h1>
            <p className="text-slate-300 max-w-xl font-bold text-sm leading-relaxed">
              Learn how to run the `arvind88765/examtopics-scraper` Python script locally on your machine to extract full certifications, then load the resulting JSON here to practice offline for free.
            </p>
          </div>
          <a 
            href="https://github.com/arvind88765/examtopics-scraper" 
            target="_blank" 
            referrerPolicy="no-referrer"
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-2 bg-neon-green text-black px-5 py-2.5 border-2 border-black font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-xs"
            id="view-github-button"
          >
            <Terminal size={16} />
            View Github Repository
          </a>
        </div>
      </div>

      {/* Warning Alert */}
      <div className="bg-white dark:bg-zinc-900 text-black dark:text-white border-2 border-black p-4 flex gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" id="cloudflare-alert">
        <AlertTriangle className="text-brand shrink-0" size={20} />
        <div className="text-sm space-y-1">
          <p className="font-black uppercase tracking-wide">Important Scraping Note:</p>
          <p className="text-black/70 dark:text-white/70 font-bold leading-relaxed">
            ExamTopics utilizes highly aggressive Cloudflare protection. Run the scraper locally on your own computer where your residential IP and the Camoufox anti-fingerprinter can bypass CAPTCHAs. Running scrapers directly in cloud sandboxes or servers will be instantly blocked by Cloudflare.
          </p>
        </div>
      </div>

      {/* Step by Step Guide */}
      <div className="space-y-6" id="guide-steps-list">
        <h2 className="text-lg font-black uppercase tracking-tight text-black dark:text-white flex items-center gap-2">
          <span className="p-1 border border-black bg-neon-green text-black">
            <Play size={16} />
          </span>
          Step-by-Step Instructions
        </h2>

        <div className="grid gap-6">
          {steps.map((step, index) => (
            <div 
              key={step.id} 
              className="bg-white dark:bg-zinc-900 border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] space-y-4"
              id={`step-card-${index}`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-black text-black dark:text-white text-lg uppercase tracking-tight">
                    {step.title}
                  </h3>
                  <p className="text-xs text-black/60 dark:text-white/60 font-bold">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Code block */}
              <div className="relative bg-zinc-950 p-4 font-mono text-xs text-brand border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" id={`code-block-${step.id}`}>
                <button
                  onClick={() => copyToClipboard(step.code, step.id)}
                  className="absolute right-3 top-3 p-1.5 bg-black hover:bg-zinc-800 border-2 border-black text-white hover:text-neon-green transition-colors"
                  title="Copy Code"
                  id={`copy-btn-${step.id}`}
                >
                  {copiedText === step.id ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
                </button>
                <pre className="overflow-x-auto whitespace-pre font-bold font-mono">{step.code}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* JSON Output Schema Reference */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] space-y-4" id="schema-reference-section">
        <div className="flex items-center gap-2">
          <span className="p-1 border border-black bg-brand text-white">
            <FileCode size={16} />
          </span>
          <h2 className="text-lg font-black uppercase tracking-tight text-black dark:text-white">Supported JSON Output Format</h2>
        </div>
        <p className="text-xs font-bold text-black/65 dark:text-white/65 leading-relaxed">
          The simulator is compatible with the standard JSON outputs produced by the Python scraper. It intelligently maps fields such as `number`/`id`, `text`/`question`, `options`/`choices`, `correct_answer`/`answer`, and `discussion`/`comments`.
        </p>

        <div className="relative bg-zinc-950 p-4 font-mono text-xs text-brand border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-h-72 overflow-y-auto" id="sample-json-block">
          <button
            onClick={() => copyToClipboard(sampleJsonOutput, "json")}
            className="absolute right-3 top-3 p-1.5 bg-black hover:bg-zinc-800 border-2 border-black text-white hover:text-neon-green transition-colors z-10"
            title="Copy JSON Schema"
            id="copy-btn-json"
          >
            {copiedText === "json" ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
          </button>
          <pre className="whitespace-pre font-bold font-mono">{sampleJsonOutput}</pre>
        </div>
      </div>
    </div>
  );
}
