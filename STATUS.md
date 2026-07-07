# ExamTopics 4All - Ponto de Situação

**Data:** 8 de julho de 2026, 08:40 JST  
**Estado:** Servidor ativo e acessível via meshnet — ✅ verificado

---

## ✅ O que foi feito

### 1. Repositório clonado e configurado
- **Localização:** `/root/examtopics-4all`
- **Repo original:** https://github.com/TinocoAI/examtopics-4all
- **Branch:** main

### 2. Integração Gemini removida (a pedido do utilizador)
- Removidas todas as dependências e rotas Gemini AI

### 3. Build e produção
- **Build de produção:** `npm run build` (frontend + backend compilados)
- **Serviço systemd:** `examtopics-4all.service` ativo e enabled

### 4. Version Tracking System (v2.0.0 — NOVO)
- **Version Picker UI:** tab "Versions" no header com histórico completo
- **API de versionamento:**
  - `GET /api/versions` — lista o changelog com todas as versões
  - `POST /api/versions/switch/:id` — faz checkout git, rebuild e restart
- **Changelog persistido:** `versions/changelog.json`
- **Snapshots Git:** cada versão é um git tag

### 5. Auto-Improvement Cron Job (NOVO)
- **Job ID:** `40ae76fa9399`
- **Agenda:** a cada 2 horas
- **Próxima execução:** 2026-07-08 10:35 JST
- **Skill:** `examtopics-portal-improvements`
- **Workdir:** `/root/examtopics-4all`
- **Funcionamento:** o agente LLM lê o changelog, escolhe uma melhoria não implementada, modifica o código fonte, regista a versão, faz build e restart
- **15 ideias de melhoria** pré-definidas no `scripts/auto-improve.py`

---

## 📋 Configuração atual

### Versões
| Versão | Data | Título | Ativa |
|--------|------|--------|-------|
| v2.0.0 | 08/07/2026 | Version Tracking System | ✅ |
| v1.0.0 | 08/07/2026 | Versão Inicial | ❌ |

### Ficheiro `.env`
```env
NODE_ENV=production
PORT=3000
```

### Acesso
- **URL:** http://100.96.178.158:3000
- **Health:** http://100.96.178.158:3000/api/health

---

## 🚀 Comandos úteis

```bash
# Ver estado do serviço
sudo systemctl status examtopics-4all.service

# Ver logs
sudo journalctl -u examtopics-4all.service -f

# Ver todas as versões
curl http://100.96.178.158:3000/api/versions

# Listar cron jobs
hermes cron list

# Ver logs do cron job
cronjob action=list
```

---

## 📝 Notas

1. **Versions Picker:** acessível pela tab "Versions" no header do portal
2. **Auto-Improvement Job:** implementa uma melhoria a cada 2h de forma autónoma
3. **Switch entre versões:** na tab Versions, clica em "Switch to vX.X" — faz checkout git, rebuild e restart
4. **Snapshots:** o git guarda tags de cada versão para rollback manual se necessário
