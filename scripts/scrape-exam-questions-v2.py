#!/usr/bin/env python3
"""
Optimized ExamTopics Question Scraper Wrapper (v2 - with cache and empty question handling)
Usage: python3 scrape-exam-questions-v2.py <provider> <exam_code> <count> <start_number>

This script:
1. First scans discussion links (first time only, uses cache after)
2. Fetches actual question pages
3. Handles empty questions (skips them, stops after 5 consecutive empties)
4. Outputs JSON array of questions
"""

import sys
import os
import json
from pathlib import Path

# Get the examtopics-scraper directory
SCRAPER_DIR = Path("/root/examtopics-scraper").resolve()
CACHE_FILE = Path("/tmp/examtopics_links_cache.json")

def get_discussion_links(provider: str, exam_code: str) -> list:
    """Get discussion links (use cache if available)"""
    import sys
    sys.path.insert(0, str(SCRAPER_DIR))
    
    from examtopics.matching import normalize_provider, provider_discussion_url
    from examtopics.fast_scanner import FastDiscussionScanner
    from examtopics.http_client import HttpFetcher
    from examtopics.cache import HtmlCache
    from examtopics.settings import DEFAULT_CACHE_DIR, DEFAULT_CACHE_TTL_SECONDS
    
    cache_key = f"{provider}/{exam_code}"
    
    # Check cache first
    if CACHE_FILE.exists():
        with open(CACHE_FILE, 'r') as f:
            cache_data = json.load(f)
            if cache_key in cache_data:
                print(f"[SCRAPER] Using cached links for {cache_key}", file=sys.stderr)
                return cache_data[cache_key]
    
    # Scan links
    print(f"[SCRAPER] Scanning discussion links for {cache_key} (first time, please wait ~3 min)...", file=sys.stderr)
    
    original_cwd = os.getcwd()
    os.chdir(SCRAPER_DIR)
    
    try:
        sys.path.insert(0, str(SCRAPER_DIR))
        from examtopics.http_client import HttpFetcher
        from examtopics.cache import HtmlCache
        from examtopics.settings import DEFAULT_CACHE_DIR, DEFAULT_CACHE_TTL_SECONDS
        
        cache_dir = Path(DEFAULT_CACHE_DIR) if isinstance(DEFAULT_CACHE_DIR, str) else DEFAULT_CACHE_DIR
        cache = HtmlCache(cache_dir, int(DEFAULT_CACHE_TTL_SECONDS))
        fetcher = HttpFetcher(timeout=15, retries=2, cache=cache, refresh_cache=False)
        
        scanner = FastDiscussionScanner(provider, fetcher)
        num_pages = scanner.get_num_pages()
        print(f"[SCRAPER] Found {num_pages} pages of discussions", file=sys.stderr)
        
        page_numbers = list(range(1, num_pages + 1))
        links = scanner.scan(page_numbers, exam_code, workers=5)
        
        # Sort links by question number
        from examtopics.matching import extract_topic_question
        links = sorted(links, key=lambda u: extract_topic_question(u))
        
        # Save to cache
        cache_data = {}
        if CACHE_FILE.exists():
            with open(CACHE_FILE, 'r') as f:
                cache_data = json.load(f)
        cache_data[cache_key] = links
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache_data, f)
        
        print(f"[SCRAPER] Cached {len(links)} links for future use", file=sys.stderr)
        return links
        
    finally:
        os.chdir(original_cwd)


def scrape_questions(provider: str, exam_code: str, count: int, start_number: int) -> list:
    """Scrape questions using cached links, skip empty questions"""
    links = get_discussion_links(provider, exam_code)
    
    if not links:
        return []
    
    # Get the requested range
    start_idx = start_number - 1
    end_idx = start_idx + count
    selected_links = links[start_idx:end_idx]
    
    # Change to scraper directory
    original_cwd = os.getcwd()
    os.chdir(SCRAPER_DIR)
    
    try:
        sys.path.insert(0, str(SCRAPER_DIR))
        from examtopics.http_client import HttpFetcher
        from examtopics.cache import HtmlCache
        from examtopics.question_parser import parse_question_page
        from examtopics.settings import DEFAULT_CACHE_DIR, DEFAULT_CACHE_TTL_SECONDS
        from pathlib import Path
        import re
        
        cache_dir = Path(DEFAULT_CACHE_DIR) if isinstance(DEFAULT_CACHE_DIR, str) else DEFAULT_CACHE_DIR
        cache = HtmlCache(cache_dir, int(DEFAULT_CACHE_TTL_SECONDS))
        fetcher = HttpFetcher(timeout=15, retries=2, cache=cache, refresh_cache=False)
        
        print(f"[SCRAPER] Fetching {len(selected_links)} question pages...", file=sys.stderr)
        
        questions = []
        empty_count = 0
        max_empty = 5  # Stop after 5 consecutive empty questions
        
        for i, url in enumerate(selected_links):
            try:
                html = fetcher.fetch_html(url)
                q = parse_question_page(html, url=url)
                
                # Check if question is empty
                q_text = q.get("question", "").strip()
                q_options = q.get("options", {})
                
                is_empty = False
                if not q_text:
                    is_empty = True
                elif isinstance(q_options, dict) and len(q_options) == 0:
                    is_empty = True
                elif isinstance(q_options, list) and len(q_options) == 0:
                    is_empty = True
                
                if is_empty:
                    empty_count += 1
                    print(f"[SCRAPER]   ⚠ Question {start_number + i} is EMPTY, skipping (empty count: {empty_count})", file=sys.stderr)
                    if empty_count >= max_empty:
                        print(f"[SCRAPER]   ✗ Stopping: hit {max_empty} consecutive empty questions (reached end of exam)", file=sys.stderr)
                        break
                    continue
                
                # Reset empty count
                empty_count = 0
                
                # Normalize options to array of strings
                options_array = []
                raw_options = q.get("options", {})
                if isinstance(raw_options, dict):
                    for key in sorted(raw_options.keys()):
                        options_array.append(f"{key}. {raw_options[key]}")
                elif isinstance(raw_options, list):
                    options_array = raw_options
                
                # Clean question text (remove options appended to text)
                question_text = q.get("question", "")
                question_text = question_text.split("Show Suggested Answer")[0].strip()
                question_text = question_text.split("View suggested answer")[0].strip()
                
                # Remove options pattern from end of text
                cleaned_text = re.sub(r'\s*[A-D]\.\s*.+$', '', question_text)
                if len(cleaned_text) < 20 and len(question_text) > 50:
                    match = re.search(r'\s+[A-D]\.\s+', question_text)
                    if match:
                        cleaned_text = question_text[:match.start()].strip()
                    else:
                        cleaned_text = question_text
                
                # Get discussions
                raw_discussions = q.get("discussion", [])
                discussion_objs = []
                for j, disc_text in enumerate(raw_discussions[:3]):
                    vote_match = re.search(r'Selected Answer:\s*([A-F])', disc_text, re.I)
                    vote = vote_match.group(1).upper() if vote_match else "A"
                    discussion_objs.append({
                        "username": f"User{j+1}",
                        "date": "Unknown",
                        "vote": vote,
                        "content": disc_text[:200]
                    })
                
                # Sequential question number
                q_num = start_number + len(questions)
                
                question_obj = {
                    "id": f"q-{q_num}",
                    "number": q_num,
                    "text": cleaned_text,
                    "options": options_array,
                    "correctAnswer": [q.get("most_voted", "A")] if q.get("most_voted") else ["A"],
                    "communityAnswer": q.get("most_voted", "A"),
                    "communityVotes": q.get("vote_counts", {}),
                    "discussion": discussion_objs  # Use SINGULAR to match frontend!
                }
                questions.append(question_obj)
                print(f"[SCRAPER]   ✓ Question {q_num}", file=sys.stderr)
                
            except Exception as e:
                print(f"[SCRAPER]   ✗ Failed to fetch {url}: {e}", file=sys.stderr)
                empty_count += 1
                if empty_count >= max_empty:
                    print(f"[SCRAPER]   ✗ Stopping: hit {max_empty} errors (likely end of exam)", file=sys.stderr)
                    break
        
        print(f"[SCRAPER] Done! {len(questions)} questions scraped (skipped {empty_count} empty).", file=sys.stderr)
        return questions
        
    finally:
        os.chdir(original_cwd)


if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python3 scrape-exam-questions-v2.py <provider> <exam_code> <count> <start_number>", file=sys.stderr)
        sys.exit(1)
    
    # Force use of venv Python
    venv_python = "/root/examtopics-scraper/.venv/bin/python3"
    if sys.executable != venv_python and os.path.exists(venv_python):
        os.execv(venv_python, [venv_python] + sys.argv)
    
    provider = sys.argv[1]
    exam_code = sys.argv[2]
    count = int(sys.argv[3])
    start_number = int(sys.argv[4])
    
    questions = scrape_questions(provider, exam_code, count, start_number)
    print(json.dumps(questions))
