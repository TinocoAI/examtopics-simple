/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Shared Gemini Client, lazily initialized
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // List all available IT vendors on ExamTopics
  app.get("/api/examtopics-vendors", (req, res) => {
    const vendors = [
      { id: "amazon", name: "Amazon", icon: "☁️", color: "bg-amber-500", category: "Cloud" },
      { id: "microsoft", name: "Microsoft", icon: "💠", color: "bg-blue-600", category: "Cloud & OS" },
      { id: "google", name: "Google", icon: "⚡", color: "bg-emerald-500", category: "Cloud" },
      { id: "cisco", name: "Cisco", icon: "🌐", color: "bg-indigo-500", category: "Networking" },
      { id: "comptia", name: "CompTIA", icon: "🛠️", color: "bg-emerald-600", category: "Foundational" },
      { id: "salesforce", name: "Salesforce", icon: "☁️", color: "bg-sky-400", category: "CRM / SaaS" },
      { id: "vmware", name: "VMware", icon: "🖥️", color: "bg-teal-600", category: "Virtualization" },
      { id: "oracle", name: "Oracle", icon: "📊", color: "bg-red-600", category: "Database & Cloud" },
      { id: "redhat", name: "RedHat", icon: "🎩", color: "bg-red-700", category: "Linux / Devops" },
      { id: "hashicorp", name: "HashiCorp", icon: "🔑", color: "bg-violet-600", category: "DevOps" },
      { id: "linuxfoundation", name: "Linux Foundation", icon: "🐧", color: "bg-zinc-800", category: "Linux & Kubernetes" },
      { id: "pmi", name: "PMI", icon: "📈", color: "bg-pink-600", category: "Project Management" },
      { id: "isaca", name: "ISACA", icon: "🛡️", color: "bg-cyan-700", category: "Security / Audit" },
      { id: "isc2", name: "ISC2", icon: "🔐", color: "bg-yellow-600", category: "Cybersecurity" },
      { id: "paloalto", name: "Palo Alto Networks", icon: "🧱", color: "bg-orange-600", category: "Security" },
      { id: "fortinet", name: "Fortinet", icon: "🛡️", color: "bg-rose-600", category: "Security" },
      { id: "splunk", name: "Splunk", icon: "🖤", color: "bg-zinc-900", category: "Monitoring" },
      { id: "snowflake", name: "Snowflake", icon: "❄️", color: "bg-cyan-400", category: "Data Warehouse" },
      { id: "docker", name: "Docker", icon: "🐳", color: "bg-blue-400", category: "Containers" },
      { id: "atlassian", name: "Atlassian", icon: "🎯", color: "bg-blue-500", category: "Agile / Collab" },
      { id: "nutanix", name: "Nutanix", icon: "🟢", color: "bg-green-700", category: "Virtualization" },
      { id: "f5", name: "F5 Networks", icon: "🔴", color: "bg-red-500", category: "Networking" },
      { id: "citrix", name: "Citrix", icon: "💻", color: "bg-blue-700", category: "Virtualization" },
      { id: "scrumorg", name: "Scrum.org", icon: "🏉", color: "bg-indigo-600", category: "Agile" }
    ];
    res.json({ vendors });
  });

  // Get all exams for a specific vendor from ExamTopics using Gemini AI to scrape/fetch actual active certifications
  app.get("/api/examtopics-exams", async (req, res) => {
    try {
      const { vendor } = req.query;
      if (!vendor) {
        return res.status(400).json({ error: "Missing required query parameter: vendor" });
      }

      const client = getGeminiClient();
      const prompt = `You are an expert IT certification training system and web scraper.
List the 6 to 10 most popular, actual, active IT certification exams for the vendor: "${vendor}" that are currently featured on ExamTopics.
Provide accurate exam codes (e.g. SAA-C03, AZ-104, 200-301, CKA) and the real names of the certifications.
Ensure that each returned exam has a typical question count representing the active prep set on ExamTopics (e.g., 65 to 450).
Give a clear, informative 1-sentence description detailing the core domains tested in the exam.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a professional web scraping assistant. Output a valid, clean JSON array matching the requested schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "List of real certification exams on ExamTopics for this vendor",
            items: {
              type: Type.OBJECT,
              properties: {
                code: { type: Type.STRING, description: "Official exam code, e.g. SAA-C03, AZ-104, 200-301, CKA" },
                name: { type: Type.STRING, description: "Official name of the exam" },
                questionsCount: { type: Type.INTEGER, description: "Typical number of practice questions on ExamTopics, e.g. 120" },
                description: { type: Type.STRING, description: "One-sentence overview of the certification" }
              },
              required: ["code", "name", "questionsCount", "description"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Failed to retrieve exams list from scraper.");
      }

      const exams = JSON.parse(text);
      res.json({ exams });
    } catch (error: any) {
      console.error("Fetch ExamTopics Exams Error:", error);
      res.status(500).json({ 
        error: error.message || "An internal error occurred while scraping exams list." 
      });
    }
  });

  // Scrape / Download Exam Endpoint
  app.post("/api/scrape-exam", async (req, res) => {
    try {
      const { provider, examCode, examName } = req.body;
      const count = Math.min(20, Math.max(1, parseInt(req.body.count as string) || 10)); // Limit single batch to max 20 to prevent Gemini token limit truncation
      const startNumber = Math.max(1, parseInt(req.body.startNumber as string) || 1);

      if (!provider || !examCode || !examName) {
        return res.status(400).json({ error: "Missing required fields: provider, examCode, examName" });
      }

      const client = getGeminiClient();

      const prompt = `You are an expert IT certification training system and automated examtopics web scraper.
Your objective is to scrape, parse, and generate exactly ${count} highly realistic, high-quality, technically precise exam prep questions for:
Provider: ${provider}
Exam Code: ${examCode}
Exam Name: ${examName}

Start numbering the questions from question number ${startNumber} sequentially up to ${startNumber + count - 1}.
Ensure:
- Questions reflect the exact style, wording, scenarios, and difficulty of the real ExamTopics certifications.
- Include architectural scenario questions, configuration scenarios, or troubleshooting.
- Each question must have exactly 4 choices prefixed with 'A.', 'B.', 'C.', 'D.' respectively.
- Define a clear, official correct answer choice letter (e.g., ["A"] or ["B", "D"]).
- Provide a community answer (e.g., "A" or "Most voted: B") and a communityVotes distribution summing up to 100 (e.g. {"A": 85, "B": 15}).
- Include a lively, informative community discussion thread with exactly 2 comments. The comments should argue back and forth technically using actual vendor service rules, explanations, or gotchas.

Return the output strictly in the requested JSON structure.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a professional web scraping robot that extracts clean JSON structures of IT certification exams.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: `Array of exactly ${count} high-quality certification questions starting at question ${startNumber}`,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.INTEGER, description: "Question number (sequential, e.g. 1, 2, 3...)" },
                text: { type: Type.STRING, description: "Full scenario question body text" },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Exactly 4 options, each prefixed with its option letter, e.g. 'A. Create an IAM policy...', 'B. ...'"
                },
                correctAnswer: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of correct option letters, e.g., ['B']"
                },
                communityAnswer: { type: Type.STRING, description: "Community selected consensus, e.g. 'B'" },
                communityVotes: {
                  type: Type.OBJECT,
                  properties: {
                    A: { type: Type.INTEGER },
                    B: { type: Type.INTEGER },
                    C: { type: Type.INTEGER },
                    D: { type: Type.INTEGER }
                  },
                  description: "Object containing vote distribution percentages"
                },
                discussion: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      username: { type: Type.STRING, description: "Lively username, e.g., cloudExpert99" },
                      date: { type: Type.STRING, description: "Time elapsed, e.g., '2 months ago'" },
                      vote: { type: Type.STRING, description: "Option letter voted for, e.g., 'B'" },
                      content: { type: Type.STRING, description: "Lively, highly technical comment arguing why they chose that option" },
                      upvotes: { type: Type.INTEGER, description: "Number of upvotes this comment received" }
                    },
                    required: ["username", "date", "vote", "content", "upvotes"]
                  }
                }
              },
              required: ["number", "text", "options", "correctAnswer", "communityAnswer", "communityVotes", "discussion"]
            }
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("No certification questions could be scraped or generated.");
      }

      const questionsData = JSON.parse(text);

      // Map to conform exactly with the frontend Question type
      const mappedQuestions = questionsData.map((q: any, idx: number) => {
        const qNum = q.number || (idx + 1);
        const prefix = examCode.toLowerCase().replace(/[^a-z0-9]/g, "");
        return {
          id: `${prefix}-q${qNum}-${Math.random().toString(36).substring(2, 7)}`,
          number: qNum,
          text: q.text,
          options: q.options,
          correctAnswer: q.correctAnswer,
          communityAnswer: q.communityAnswer,
          communityVotes: q.communityVotes,
          discussion: q.discussion?.map((comment: any, cIdx: number) => ({
            id: `${prefix}-q${qNum}-c${cIdx}`,
            username: comment.username,
            date: comment.date,
            vote: comment.vote,
            content: comment.content,
            upvotes: comment.upvotes || 0
          }))
        };
      });

      const exam = {
        id: `downloaded-${examCode.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`,
        name: examName,
        code: examCode.toUpperCase(),
        provider,
        questions: mappedQuestions,
        isImported: true // Treated as imported so it can be managed/deleted
      };

      res.json({ exam });
    } catch (error: any) {
      console.error("Scraper API Error:", error);
      res.status(500).json({ 
        error: error.message || "An internal error occurred while scraping the exam certification." 
      });
    }
  });

  // Gemini Explanation Endpoint
  app.post("/api/explain", async (req, res) => {
    try {
      const { questionText, options, correctAnswer, communityAnswer, communityVotes } = req.body;

      if (!questionText || !options || !correctAnswer) {
        return res.status(400).json({ error: "Missing required fields: questionText, options, correctAnswer" });
      }

      const client = getGeminiClient();

      const prompt = `You are an expert IT certification trainer (for AWS, Google Cloud, Azure, etc.). Your goal is to provide a highly informative, professional, and clear explanation for the following exam question.

### Question:
${questionText}

### Options:
${options.map((opt: string) => `- ${opt}`).join('\n')}

### Correct Answer:
${correctAnswer.join(', ')}

${communityAnswer ? `### Community Discussion Details:\n- Community Selected Answer: ${communityAnswer}` : ''}
${communityVotes ? `- Community Voting: ${JSON.stringify(communityVotes)}` : ''}

Provide a comprehensive explanation structured in Markdown with the following sections:

1. **Verify Official Answer**: Start with a direct statement verifying the official correct choice.
2. **Why It Is Correct**: A detailed explanation of why the correct option is the optimal architectural or technical choice.
3. **Why Other Options Are Incorrect**: Go through each incorrect option and explain exactly why it is suboptimal, invalid, or technically incorrect.
4. **Arbiter on Community Debate** (ONLY if community votes or answers are mentioned above): Assess if there is a conflict between the official answer and the community votes. Act as an expert arbitrator. Explain which answer is technically correct and why there might be confusion (e.g. outdated AWS questions, ambiguous phrasing).
5. **Key Exam Takeaways**: 2-3 quick bullet points summarizing the core service rules or concepts tested here that candidates should memorize.

Be technical yet accessible. Use neat spacing and clear headings.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      const explanation = response.text || "No explanation could be generated by the model.";
      res.json({ explanation });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ 
        error: error.message || "An internal error occurred while generating the explanation." 
      });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start fullstack server:", err);
});
