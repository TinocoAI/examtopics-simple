#!/usr/bin/env python3
"""
ExamTopics 4All - Auto-Improvement Engine
Runs every 2 hours via cron job to implement a new improvement.
Tags current state, makes changes, commits, updates changelog, rebuilds, restarts.
"""

import json
import os
import random
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT_DIR = Path("/root/examtopics-4all")
CHANGELOG_FILE = PROJECT_DIR / "versions" / "changelog.json"
SCRIPTS_DIR = PROJECT_DIR / "scripts"

# Ideas for improvements to cycle through
IMPROVEMENTS = [
    {
        "id": "exam-stats",
        "title": "Exam Statistics Dashboard",
        "description": "Gráficos e estatísticas detalhadas por exame: % de acertos por tópico, tempo médio por questão, evolução de score ao longo do tempo.",
        "changes": [
            "Gráfico de evolução de score por tentativa",
            "Estatísticas detalhadas por exame (acertos/erros)",
            "Tempo médio por questão analisado",
            "Visualização de progresso por categoria/tópico",
        ]
    },
    {
        "id": "flashcard-enhancements",
        "title": "Enhanced Flashcard Mode",
        "description": "Melhorias no modo flashcards: swipe gestures, animações de virada, modo aleatório, progresso visual por deck.",
        "changes": [
            "Animações suaves de virada de flashcard",
            "Modo aleatório (shuffle) para flashcards",
            "Contador de progresso visual (X/Y cards)",
            "Teclas de atalho no teclado (setas/ESPN)",
        ]
    },
    {
        "id": "exam-export",
        "title": "Multi-Format Exam Export",
        "description": "Exportar exames em PDF, TXT e CSV para estudo offline. Inclui questões, respostas e discussões.",
        "changes": [
            "Exportação para PDF formatado",
            "Exportação para TXT simples",
            "Exportação para CSV (importável para Excel/Anki)",
            "Seleção de questões específicas para exportar",
        ]
    },
    {
        "id": "timer-enhancements",
        "title": "Exam Timer & Proctor Features",
        "description": "Timer configurável por exame, modo de tempo realista (baseado no exame real), alertas de tempo, pausas.",
        "changes": [
            "Timer configurável (minutos ou baseado no exame)",
            "Alerta visual/sonoro a meio do tempo",
            "Contagem decrescente com aviso aos 5 min",
            "Pausa automática ao sair do foco (anti-cheat visual)",
        ]
    },
    {
        "id": "search-improvements",
        "title": "Global Search & Filter",
        "description": "Pesquisa global em todas as questões de todos os exames. Filtros por palavra-chave, tag, dificuldade, etc.",
        "changes": [
            "Campo de pesquisa global com autocomplete",
            "Filtro por palavra-chave no texto da questão",
            "Filtro por tag/categoria",
            "Resultados com preview da questão e do exame",
        ]
    },
    {
        "id": "ui-refresh",
        "title": "Visual Theme Polish",
        "description": "Melhorias visuais: animações de transição entre tabs, cores refinadas, modo contraste, badges de dificuldade.",
        "changes": [
            "Animações de transição suaves entre tabs",
            "Badges de dificuldade por questão (fácil/médio/difícil)",
            "Modo de alto contraste para acessibilidade",
            "Ícones mais expressivos e hover states refinados",
        ]
    },
    {
        "id": "history-insights",
        "title": "Practice History Insights",
        "description": "Análise inteligente do histórico de prática: questões mais erradas, áreas fracas, recomendação de revisão.",
        "changes": [
            "Top 10 questões mais erradas",
            "Identificação de áreas fracas por categoria",
            "Recomendação automática de revisão",
            "Calendário de prática (dias activos)",
        ]
    },
    {
        "id": "exam-notes",
        "title": "Personal Notes & Annotations",
        "description": "Sistema de notas pessoais por questão. Anotações privadas destacadas no discussion board, exportáveis.",
        "changes": [
            "Campo de notas pessoais por questão",
            "Notas destacadas visualmente no discussion board",
            "Exportação de notas junto com o exame",
            "Indicador visual de questões com notas",
        ]
    },
    {
        "id": "keyboard-shortcuts",
        "title": "Keyboard Shortcuts Guide",
        "description": "Atalhos de teclado para navegação rápida: next/prev, marcar resposta, bookmark, toggle temas. Guia modal de atalhos.",
        "changes": [
            "Setas ← → para navegar entre questões",
            "Tecla A/B/C/D/D para selecionar resposta",
            "Ctrl+B para bookmark, Ctrl+T para tema",
            "Modal '?' com lista completa de atalhos",
        ]
    },
    {
        "id": "performance-metrics",
        "title": "Exam Performance Metrics",
        "description": "Métricas de performance por exame: percentil, tempo médio por questão, comparação com média da comunidade (simulada).",
        "changes": [
            "Percentil do score (comparação simulada)",
            "Tempo médio por questão com breakdown",
            "Gráfico de desempenho ao longo do exame",
            "Previsão de score final baseada no ritmo",
        ]
    },
    {
        "id": "dark-theme-enhance",
        "title": "Advanced Dark Theme",
        "description": "Tema dark melhorado com três variantes: escuro, cinzento, azul noturno. Persistência por sessão.",
        "changes": [
            "Três variantes de tema dark: escuro, cinzento, night blue",
            "Transição suave entre temas",
            "Badge de tema ativo no header",
            "Preferência sincronizada com sistema (prefers-color-scheme)",
        ]
    },
    {
        "id": "exam-import-batch",
        "title": "Batch Exam Import",
        "description": "Importar múltiplos exames em lote a partir de um diretório ou URL. Validação automática de formato.",
        "changes": [
            "Upload múltiplo de ficheiros JSON",
            "Importação a partir de URL remota",
            "Validação automática de formato antes de importar",
            "Feedback visual de progresso na importação",
        ]
    },
    {
        "id": "responsive-mobile",
        "title": "Mobile-First Responsive",
        "description": "Layout otimizado para dispositivos móveis: gestos touch, bottom navigation, flashcard swipe, layout adaptativo.",
        "changes": [
            "Bottom navigation bar em mobile (em vez de tabs no topo)",
            "Gestos de swipe para navegar entre questões",
            "Layout adaptativo para ecrãs pequenos (< 640px)",
            "Aumento de touch targets para melhor usabilidade mobile",
        ]
    },
    {
        "id": "exam-bookmarks-page",
        "title": "Bookmarks Manager Page",
        "description": "Página dedicada para gerir bookmarks: agrupar por exame, pesquisar, exportar lista de bookmarks.",
        "changes": [
            "Página 'Bookmarks' com vista geral de todas as questões marcadas",
            "Agrupamento por exame com contagem",
            "Pesquisa dentro dos bookmarks",
            "Exportar lista de bookmarks para JSON",
        ]
    },
    {
        "id": "comparison-mode",
        "title": "Side-by-Side Question Comparison",
        "description": "Modo de comparação para ver duas questões lado a lado. Útil para comparar respostas ou discutir diferenças.",
        "changes": [
            "Botão 'Compare' com seleção de duas questões",
            "Vista side-by-side com sincronização de scroll",
            "Destaque visual de diferenças",
            "Atalho de teclado Ctrl+Shift+C para abrir comparação",
        ]
    },
]

def log(msg):
    print(f"[IMPROVEMENT] {msg}", flush=True)

def run_cmd(cmd, cwd=PROJECT_DIR, timeout=60):
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    if result.returncode != 0:
        log(f"CMD FAILED ({result.returncode}): {' '.join(cmd)}")
        log(f"  stderr: {result.stderr[:500]}")
    return result

def get_last_improvement_id():
    """Get the last implemented improvement ID from changelog"""
    if not CHANGELOG_FILE.exists():
        return None
    with open(CHANGELOG_FILE) as f:
        data = json.load(f)
    # Find improvements (exclude v1.0.0 which is the base)
    improvement_versions = [v for v in data["versions"] if v["id"].startswith("v1.")]
    if not improvement_versions:
        return None
    # Check which improvements have been done
    done_titles = set(v["title"] for v in improvement_versions)
    return done_titles

def compute_next_version(changelog):
    """Compute next version number based on total_improvements"""
    count = changelog.get("total_improvements", 0)
    major = 1
    minor = count 
    return f"v1.{minor}.0"

def main():
    log("=" * 60)
    log("Starting auto-improvement cycle")
    log("=" * 60)

    # 1. Read changelog
    if not CHANGELOG_FILE.exists():
        log("ERROR: changelog.json not found!")
        return 1

    with open(CHANGELOG_FILE) as f:
        changelog = json.load(f)

    # 2. Determine which improvements have been done
    done_titles = set()
    for v in changelog["versions"]:
        if "title" in v:
            done_titles.add(v["title"])

    # 3. Pick an improvement that hasn't been done yet
    available = [imp for imp in IMPROVEMENTS if imp["title"] not in done_titles]
    if not available:
        log("All improvements have been implemented! Cycling from start...")
        available = IMPROVEMENTS  # Start cycling again

    improvement = random.choice(available)
    log(f"Selected improvement: {improvement['title']}")

    # 4. Compute version
    next_ver = compute_next_version(changelog)
    log(f"Next version: {next_ver}")

    # 5. Git tag current state before changes
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "--allow-empty", "-m", f"snapshot before {improvement['id']}"])

    # Check if tag already exists
    tag_check = run_cmd(["git", "tag", "-l", next_ver])
    if next_ver in tag_check.stdout.split():
        log(f"Tag {next_ver} already exists, incrementing...")
        # Find next available tag
        existing_tags = set(tag_check.stdout.strip().split())
        i = 2
        while True:
            candidate = f"v1.{changelog['total_improvements']}.{i}"
            if candidate not in existing_tags:
                next_ver = candidate
                break
            i += 1
        log(f"Using version: {next_ver}")

    # Tag the snapshot before changes
    run_cmd(["git", "tag", "-a", next_ver, "-m", f"Snapshot before {improvement['id']}"])

    # 6. Actually implement the improvement!
    # For autonomous improvements, we use the improvement scripts
    improvement_script = SCRIPTS_DIR / f"improve-{improvement['id']}.py"
    if improvement_script.exists():
        log(f"Running improvement script: {improvement_script}")
        result = run_cmd([sys.executable, str(improvement_script)], timeout=120)
        if result.returncode != 0:
            log(f"Improvement script failed! Reverting...")
            run_cmd(["git", "checkout", "-f", next_ver])
            return 1
    else:
        log(f"No improvement script found at {improvement_script}")
        log(f"Creating placeholder — actual improvement script needs to be created")
        # Create a simple improvement: update a marker file
        # This is a placeholder — the improvement script should be created by the cron job runner
        # or by a separate mechanism
        log("No autonomous implementation available — skipping code changes")
        # Remove the tag since we didn't make changes
        run_cmd(["git", "tag", "-d", next_ver])
        return 0

    # 7. Update changelog
    new_version_entry = {
        "id": next_ver,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "title": improvement["title"],
        "description": improvement["description"],
        "changes": improvement["changes"],
        "git_tag": next_ver,
        "is_current": True,
    }

    # Mark old versions as not current
    for v in changelog["versions"]:
        v["is_current"] = False

    changelog["versions"].append(new_version_entry)
    changelog["total_improvements"] += 1

    with open(CHANGELOG_FILE, "w") as f:
        json.dump(changelog, f, indent=2, ensure_ascii=False)

    # 8. Git commit + tag the improvement
    run_cmd(["git", "add", "-A"])
    run_cmd(["git", "commit", "-m", f"{next_ver}: {improvement['title']}"])

    # Tag the final state
    tag_final = f"{next_ver}-done"
    run_cmd(["git", "tag", "-a", tag_final, "-m", f"{next_ver}: {improvement['title']}"])

    # 9. Rebuild & restart
    log("Rebuilding...")
    result = run_cmd(["npm", "run", "build"], timeout=120)
    if result.returncode != 0:
        log("Build failed! Version created but service not restarted.")
        return 1

    log("Restarting service...")
    run_cmd(["systemctl", "restart", "examtopics-4all"], timeout=30)

    log(f"Successfully deployed {next_ver}: {improvement['title']}")
    log("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())