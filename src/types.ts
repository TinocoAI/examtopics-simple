/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Comment {
  id: string;
  username: string;
  date: string;
  vote?: string;
  content: string;
  upvotes: number;
}

export interface Question {
  id: string; // unique id, e.g. "aws-saa-c03-q1"
  number: string | number; // e.g. "1" or "Question #1"
  text: string;
  options: string[]; // E.g. ["A. Option text", "B. Option text"] or just ["Option text"]
  correctAnswer: string[]; // E.g. ["A"] or ["A", "C"]
  communityAnswer?: string; // E.g. "A" or "Most voted: B"
  communityVotes?: { [option: string]: number }; // E.g. {"A": 85, "B": 15}
  discussion?: Comment[];
}

export interface Exam {
  id: string; // unique id
  name: string; // e.g. "AWS Certified Solutions Architect - Associate"
  code: string; // e.g. "SAA-C03"
  provider: string; // e.g. "Amazon Web Services" or "Google Cloud"
  questions: Question[];
  isImported?: boolean;
}

export interface PracticeHistory {
  id: string;
  examId: string;
  examName: string;
  examCode: string;
  date: string;
  score: number;
  totalQuestions: number;
  elapsedTime: number; // in seconds
  mode: 'practice' | 'exam';
}
