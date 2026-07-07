/**
 * ExamTopics 4All - Server
 * Serves static frontend + API routes with static vendor/exam data
 */

import express from "express";
import path, { join } from "path";
import { createServer as createViteServer } from "vite";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import { readFileSync, writeFileSync, existsSync } from "fs";

const execFileAsync = promisify(execFile);
const SCRIPTS_DIR = join(process.cwd(), 'scripts');
const VERSIONS_DIR = join(process.cwd(), 'versions');

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // List all available IT vendors on ExamTopics (static)
  app.get("/api/examtopics-vendors", async (req, res) => {
    try {
      const vendors = getStaticVendors();
      res.json({ vendors });
    } catch (err: any) {
      console.error("Error loading vendors:", err.message);
      res.status(500).json({ error: "Failed to load vendors" });
    }
  });

  // Scrape exams for a specific vendor
  app.get("/api/examtopics-exams", async (req, res) => {
    const vendor = req.query.vendor as string;
    if (!vendor) {
      return res.status(400).json({ error: "Vendor parameter is required" });
    }

    try {
      // Try real scraping first (v2 - improved)
      console.log(`[API] Scraping exams for vendor: ${vendor}`);
      const exams = await runScraperScript('scrape-exams-v2.js', vendor);
      
      if (exams && exams.length > 0) {
        console.log(`[API] Found ${exams.length} exams via scraping`);
        return res.json({ exams });
      }
      
      // Fallback to static data if scraping returned empty
      console.log(`[API] Scraping returned empty, trying static data...`);
      const staticExams = getStaticExamsForVendor(vendor);
      res.json({ exams: staticExams });
      
    } catch (err: any) {
      console.error('[API] Error scraping exams:', err.message);
      // Final fallback to static data
      const exams = getStaticExamsForVendor(vendor);
      res.json({ exams });
    }
  });

  // Execute scraper to download exam questions (REAL scraping using examtopics-scraper)
  app.post("/api/scrape-exam", express.json(), async (req, res) => {
    const { provider, examCode, examName, count, startNumber } = req.body;

    if (!provider || !examCode) {
      return res.status(400).json({ error: "Provider and examCode are required" });
    }

    try {
      // Normalize provider: "Check Point" → "checkpoint", "Amazon Web Services" → "amazon"
      const normalizedProvider = provider.toLowerCase()
        .replace(/\s+/g, '') // Remove spaces
        .replace(/[^a-z0-9]/g, ''); // Remove special chars
      
      console.log(`[API] Scraping REAL questions for ${provider} (=${normalizedProvider}) ${examCode} (count=${count}, start=${startNumber})`);
      
      // Spawn Python script with the real scraper (v2 with caching)
      // Use venv Python directly to ensure dependencies (tqdm, etc.) are available
      const venvPython = join('/root/examtopics-scraper/.venv/bin/python3');
      const pythonExe = require('fs').existsSync(venvPython) ? venvPython : 'python3';
      
      const scriptPath = join(SCRIPTS_DIR, 'scrape-exam-questions-v2.py');
      const args = [
        scriptPath,
        normalizedProvider, // Use normalized provider slug
        examCode,
        (count || 10).toString(),
        (startNumber || 1).toString()
      ];
      
      console.log(`[API] Running: ${pythonExe} ${args.join(' ')}`);
      
      const { stdout, stderr } = await execFileAsync(pythonExe, args, {
        cwd: SCRIPTS_DIR
        // NO timeout - let it run as long as needed!
      });
      
      if (stderr) {
        console.error(`[API] Scraper stderr: ${stderr}`);
      }
      
      // Parse stdout (should be JSON array of questions)
      let questions;
      try {
        questions = JSON.parse(stdout);
      } catch (parseErr) {
        throw new Error(`Failed to parse scraper output: ${stdout.substring(0, 200)}`);
      }
      
      if (!Array.isArray(questions)) {
        throw new Error(`Scraper returned invalid data (not an array): ${stdout.substring(0, 200)}`);
      }
      
      // If no questions returned, this is end of exam (not an error!)
      if (questions.length === 0) {
        console.log(`[API] No more questions available (end of exam reached)`);
        return res.json({ 
          exam: null, 
          endOfExam: true,
          message: "No more questions available - end of exam reached"
        });
      }
      
      const exam = {
        id: `downloaded-${examCode.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
        name: examName || `${provider} ${examCode}`,
        code: examCode.toUpperCase(),
        provider: provider,
        questions: questions,
        isImported: true
      };
      
      console.log(`[API] Successfully scraped ${questions.length} questions!`);
      res.json({ exam });
      
    } catch (err: any) {
      console.error('[API] Error scraping questions:', err.message);
      res.status(500).json({ error: err.message || "Scraper failed" });
    }
  });

  // ==== Version Management API ====

  // Get version history
  app.get("/api/versions", (req, res) => {
    const manifestPath = join(VERSIONS_DIR, 'changelog.json');
    if (!existsSync(manifestPath)) {
      return res.json({ versions: [], total_improvements: 0 });
    }
    try {
      const raw = readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw);
      res.json(manifest);
    } catch (err: any) {
      console.error('[API] Error reading version manifest:', err.message);
      res.status(500).json({ error: "Failed to read version manifest" });
    }
  });

  // Switch to a specific version
  app.post("/api/versions/switch/:versionId", async (req, res) => {
    const { versionId } = req.params;
    
    // Read manifest to verify version exists
    const manifestPath = join(VERSIONS_DIR, 'changelog.json');
    let manifest: any;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    } catch {
      return res.status(500).json({ success: false, error: "Cannot read version manifest" });
    }

    const version = manifest.versions.find((v: any) => v.id === versionId);
    if (!version) {
      return res.status(404).json({ success: false, error: `Version ${versionId} not found` });
    }

    console.log(`[API] Switching to version: ${versionId} (git tag: ${version.git_tag})`);

    try {
      // Git checkout to the tagged version
      const { stdout, stderr } = await execFileAsync('git', ['checkout', version.git_tag, '-f'], {
        cwd: process.cwd(),
        timeout: 30000
      });
      console.log(`[API] Git checkout output: ${stdout}`);
      if (stderr) console.error(`[API] Git checkout stderr: ${stderr}`);

      // Update changelog to mark this version as current
      manifest.versions.forEach((v: any) => v.is_current = (v.id === versionId));
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      // Schedule restart (respond first, then restart)
      res.json({ success: true, message: `Switching to ${versionId}. Server restarting...` });

      // Rebuild and restart after responding
      setTimeout(async () => {
        try {
          console.log(`[API] Rebuilding for version ${versionId}...`);
          await execFileAsync('npm', ['run', 'build'], { cwd: process.cwd(), timeout: 120000 });
          console.log(`[API] Build complete. Restarting service...`);
          await execFileAsync('systemctl', ['restart', 'examtopics-4all']);
        } catch (err: any) {
          console.error(`[API] Failed to rebuild/restart for version ${versionId}:`, err.message);
        }
      }, 1000);

    } catch (err: any) {
      console.error(`[API] Failed to switch to version ${versionId}:`, err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Serve static assets / Vite setup
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode with static file assets...");
    const distPath = join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "100.96.178.158", () => {
    console.log(`Server is running on http://100.96.178.158:${PORT}`);
  });
}

// Helper function to run scraper scripts
function runScraperScript(scriptName: string, ...args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(SCRIPTS_DIR, scriptName);
    const child = spawn('node', [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Scraper failed: ${errorOutput}`));
        return;
      }
      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (e) {
        resolve(output.trim());
      }
    });
  });
}

// Static vendor list
function getStaticVendors() {
  return [
    { id: "amazon", name: "Amazon", icon: "☁️", color: "bg-amber-500", category: "Cloud" },
    { id: "microsoft", name: "Microsoft", icon: "💠", color: "bg-blue-600", category: "Cloud & OS" },
    { id: "google", name: "Google", icon: "⚡", color: "bg-emerald-500", category: "Cloud" },
    { id: "cisco", name: "Cisco", icon: "🌐", color: "bg-indigo-500", category: "Networking" },
    { id: "comptia", name: "CompTIA", icon: "🛠️", color: "bg-emerald-600", category: "Foundational" },
    { id: "checkpoint", name: "Check Point", icon: "🔐", color: "bg-red-600", category: "Security" },
    { id: "aruba", name: "Aruba", icon: "📡", color: "bg-blue-500", category: "Networking" },
  ];
}

// Static exam lists for known vendors
function getStaticExamsForVendor(vendor: string) {
  const vendorLower = vendor.toLowerCase().trim();  
  // Amazon / AWS
  if (vendorLower.includes('amazon') || vendorLower.includes('aws') || vendorLower === 'amazon') {
    return [
      { code: 'SAA-C03', name: 'AWS Certified Solutions Architect - Associate', questionsCount: 65, description: 'AWS SAA-C03 certification exam' },
      { code: 'DVA-C02', name: 'AWS Certified Developer - Associate', questionsCount: 65, description: 'AWS DVA-C02 certification exam' },
      { code: 'SOA-C02', name: 'AWS Certified SysOps Administrator - Associate', questionsCount: 65, description: 'AWS SOA-C02 certification exam' },
      { code: 'SAP-C02', name: 'AWS Certified Solutions Architect - Professional', questionsCount: 75, description: 'AWS SAP-C02 certification exam' },
      { code: 'DOP-C02', name: 'AWS Certified DevOps Engineer - Professional', questionsCount: 75, description: 'AWS DOP-C02 certification exam' },
      { code: 'AIF-C01', name: 'AWS Certified AI Practitioner', questionsCount: 50, description: 'AWS AIF-C01 certification exam' },
      { code: 'CLF-C02', name: 'AWS Certified Cloud Practitioner', questionsCount: 50, description: 'AWS CLF-C02 certification exam' },
    ];
  }
  // Microsoft / Azure
  if (vendorLower.includes('microsoft') || vendorLower.includes('azure') || vendorLower === 'microsoft') {
    return [
      { code: 'AZ-104', name: 'Microsoft Azure Administrator', questionsCount: 50, description: 'Azure Administrator exam' },
      { code: 'AZ-204', name: 'Microsoft Azure Developer Associate', questionsCount: 50, description: 'Azure Developer exam' },
      { code: 'AZ-305', name: 'Microsoft Azure Solutions Architect Expert', questionsCount: 50, description: 'Azure Architect exam' },
      { code: 'AZ-500', name: 'Microsoft Azure Security Technologies', questionsCount: 50, description: 'Azure Security exam' },
      { code: 'MS-900', name: 'Microsoft 365 Fundamentals', questionsCount: 50, description: 'M365 Fundamentals exam' },
    ];
  }
  // Google / GCP
  if (vendorLower.includes('google') || vendorLower.includes('gcp') || vendorLower === 'google') {
    return [
      { code: 'Professional-Cloud-Architect', name: 'Google Cloud Professional Cloud Architect', questionsCount: 50, description: 'GCP Architect exam' },
      { code: 'Associate-Cloud-Engineer', name: 'Google Cloud Associate Cloud Engineer', questionsCount: 50, description: 'GCP Engineer exam' },
      { code: 'Professional-Data-Engineer', name: 'Google Cloud Professional Data Engineer', questionsCount: 50, description: 'GCP Data exam' },
    ];
  }
  // Cisco
  if (vendorLower.includes('cisco') || vendorLower === 'cisco') {
    return [
      { code: '200-301', name: 'Cisco Certified Network Associate (CCNA)', questionsCount: 120, description: 'CCNA exam' },
      { code: '350-401', name: 'Implementing Cisco Enterprise Network Core Technologies (ENCOR)', questionsCount: 90, description: 'CCNP Core exam' },
      { code: '300-410', name: 'Implementing Cisco Enterprise Advanced Routing and Services (ENARSI)', questionsCount: 60, description: 'CCNP ENARSI exam' },
    ];
  }
  // CompTIA
  if (vendorLower.includes('comptia') || vendorLower === 'comptia') {
    return [
      { code: 'SY0-701', name: 'CompTIA Security+', questionsCount: 90, description: 'Security+ exam' },
      { code: 'N10-008', name: 'CompTIA Network+', questionsCount: 90, description: 'Network+ exam' },
      { code: 'A+', name: 'CompTIA A+ Core 1 & 2', questionsCount: 90, description: 'A+ exam' },
    ];
  }
  // Check Point
  if ((vendorLower.includes('check') && vendorLower.includes('point')) || vendorLower === 'checkpoint') {
    return [
      { code: '156-315.81', name: 'Check Point Certified Security Expert (CCSE) R81', questionsCount: 100, description: 'CCSE R81 exam' },
      { code: '156-215.81', name: 'Check Point Certified Security Administrator (CCSA) R81', questionsCount: 90, description: 'CCSA R81 exam' },
      { code: '156-110', name: 'Check Point Certified Security Principles Associate (CCSPA)', questionsCount: 80, description: 'CCSPA exam' },
    ];
  }
  // Aruba
  if (vendorLower.includes('aruba') || vendorLower === 'aruba') {
    return [
      { code: 'ACCP-v6.2', name: 'Aruba Certified ClearPass Professional', questionsCount: 60, description: 'ACCP exam' },
      { code: 'ACMP_6.4', name: 'Aruba Certified Mobility Professional', questionsCount: 75, description: 'ACMP exam' },
    ];
  }
  // Unknown vendor - return empty array
  return [];
}

// Generate mock questions for testing
function generateMockQuestions(count: number) {
  const questions = [];
  for (let i = 1; i <= count; i++) {
    questions.push({
      id: `q-${i}`,
      number: i,
      text: `This is question ${i} about ${Math.random().toString(36).substring(7)}...`,
      options: [
        `A. Option A for question ${i}`,
        `B. Option B for question ${i}`,
        `C. Option C for question ${i}`,
        `D. Option D for question ${i}`
      ],
      correctAnswer: ['A'],
      communityAnswer: 'A',
      communityVotes: { 'A': Math.floor(Math.random() * 100) },
      discussions: [
        {
          username: 'User' + Math.floor(Math.random() * 1000),
          date: '2 months ago',
          vote: 'A',
          content: 'I think the answer is A because...'
        }
      ]
    });
  }
  return questions;
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
