#!/usr/bin/env python3
"""
ExamTopics Real Question Scraper Wrapper
Uses the examtopics-scraper repo to fetch REAL questions.
Usage: python3 scrape-exam-questions.py <provider> <exam_code> <count> <start_number>
Output: JSON array of question objects on stdout
"""
import sys
import json
import os
from pathlib import Path
from pathlib import Path

# Path to the cloned scraper repo
SCRAPER_DIR = Path("/root/examtopics-scraper")

def run_scraper(provider: str, exam_code: str, count: int, start_number: int) -> list:
    """
    Run the examtopics-scraper main.py in non-interactive mode.
    Since main.py uses interactive prompts, we call the internal modules directly.
    """
    # CRITICAL: Change to scraper directory so imports work
    original_cwd = os.getcwd()
    os.chdir(SCRAPER_DIR)
    
    try:
        sys.path.insert(0, str(SCRAPER_DIR))
        
        from examtopics.http_client import HttpFetcher
        from examtopics.cache import HtmlCache
        from examtopics.fast_scanner import FastDiscussionScanner
        from examtopics.question_parser import parse_question_page
        from examtopics.matching import build_page_numbers, normalize_provider
        from examtopics.settings import DEFAULT_CACHE_DIR, DEFAULT_CACHE_TTL_SECONDS
        
        provider = normalize_provider(provider)
        # Convert cache dir to Path if it's a string
        cache_dir = Path(DEFAULT_CACHE_DIR) if isinstance(DEFAULT_CACHE_DIR, str) else DEFAULT_CACHE_DIR
        cache = HtmlCache(cache_dir, int(DEFAULT_CACHE_TTL_SECONDS))
        fetcher = HttpFetcher(
            timeout=int(15),
            retries=int(2),
            cache=cache,
            refresh_cache=False
        )
        
        # Step 1: Scan discussion links for this exam
        print(f"[SCRAPER] Scanning discussion links for {provider}/{exam_code} ...", file=sys.stderr)
        scanner = FastDiscussionScanner(provider, fetcher, delay_range=(1, 3))
        total_pages = scanner.get_num_pages()
        page_numbers = build_page_numbers(total_pages, 1, None, None)
        links = scanner.scan(page_numbers, exam_code, workers=8)
        
        if not links:
            print(f"[SCRAPER] No links found for {exam_code}, trying fallback...", file=sys.stderr)
            return []
        
        # Step 2: Sort links and pick the requested range
        from examtopics.matching import extract_topic_question
        links = sorted(links, key=lambda u: extract_topic_question(u))
        links = links[(start_number - 1):(start_number - 1 + count)]
        
        print(f"[SCRAPER] Fetching {len(links)} question pages...", file=sys.stderr)
        
        # Step 3: Fetch each question page and parse
        questions = []
        for i, url in enumerate(links):
            try:
                html = fetcher.fetch_html(url)
                q = parse_question_page(html, url=url)
                # Normalize to our frontend format
                question_obj = {
                    "id": f"q-{start_number + i}",
                    "number": start_number + i,
                    "text": q.get("question_text", ""),
                    "options": q.get("options", []),
                    "correctAnswer": q.get("most_accepted_answer", "").split() if q.get("most_accepted_answer") else ["A"],
                    "communityAnswer": q.get("most_accepted_answer", "A"),
                    "communityVotes": q.get("vote_counts", {}),
                    "discussions": [
                        {"username": d.get("user", "Unknown"), "date": d.get("date", ""), "vote": d.get("selected_answer", "A"), "content": d.get("comment", "")}
                        for d in q.get("discussions", [])[:3]
                    ]
                }
                questions.append(question_obj)
                print(f"[SCRAPER]   ✓ Question {start_number + i}: {q.get('question_text', '')[:60]}...", file=sys.stderr)
            except Exception as e:
                print(f"[SCRAPER]   ✗ Failed to fetch {url}: {e}", file=sys.stderr)
        
        print(f"[SCRAPER] Done! {len(questions)} questions scraped.", file=sys.stderr)
        return questions
        
    finally:
        # Restore original directory
        os.chdir(original_cwd)


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python3 scrape-exam-questions.py <provider> <exam_code> <count> <start_number>", file=sys.stderr)
        sys.exit(1)
    
    # Use the venv Python to ensure dependencies are available
    venv_python = SCRAPER_DIR / ".venv" / "bin" / "python3"
    if venv_python.exists():
        # Re-execute this script with the venv Python
        os.execv(str(venv_python), [str(venv_python), __file__] + sys.argv[1:])
    
    # Fallback: use system Python (assumes dependencies are installed)
    provider = sys.argv[1]
    exam_code = sys.argv[2]
    count = int(sys.argv[3])
    start_number = int(sys.argv[4])
    
    try:
        questions = run_scraper(provider, exam_code, count, start_number)
        # Output JSON to stdout (captured by Node.js)
        print(json.dumps(questions))
    except Exception as e:
        print(f"[SCRAPER] Fatal error: {e}", file=sys.stderr)
        # Output empty array so Node doesn't crash
        print("[]")
        sys.exit(1)
