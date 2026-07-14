# ExamTopics Simple Portal

Um portal web simples e eficiente para praticar exames de certificação usando dados do ExamTopics.com.

## 📋 Descrição

Este portal permite importar exames em formato JSON (através do scraper do ExamTopics ou uploads manuais) e praticar as perguntas num simulador interativo. Todos os dados são guardados localmente no teu browser (localStorage), por isso cada utilizador tem as suas próprias estatísticas e histórico.

## ✨ Funcionalidades

- **Dashboard**: Visualiza todos os exames importados, estatísticas e histórico de prática
- **JSON Importer**: Importa exames em formato JSON (compatível com o scraper arvind88765)
- **Simulador de Exames**: Pratica em modo Practice, Exam ou Flashcards
- **Bookmarks**: Marca perguntas importantes para rever depois
- **Estatísticas**: Acompanha o teu progresso e pontuações
- **Tema Claro/Escuro**: Alterna entre temas conforme a tua preferência

## 🚀 Pré-requisitos

- Node.js (versão 18 ou superior)
- npm (vem com o Node.js)

## 📦 Instalação

1. Clona o repositório:
```bash
git clone https://github.com/TinocoAI/examtopics-simple.git
cd examtopics-simple
```

2. Instala as dependências:
```bash
npm install
```

## 🏃‍♂️ Como Executar

### Modo Desenvolvimento (com hot-reload)
```bash
npm run dev
```
O portal fica acessível em `http://localhost:3001`

### Modo Produção
```bash
npm run build
npm start
```
Ou usa o script `start.sh` incluído:
```bash
./start.sh
```

## 📝 Como Usar

### 1. Importar um Exame

1. Acede ao separador "JSON Importer"
2. Arrasta um ficheiro JSON ou clica para selecionar
3. O portal deteta automaticamente o formato do exame
4. Configura os metadados (Provider, Código, Nome)
5. Clica em "Complete Import and Load to Simulator"

### 2. Praticar um Exame

1. No Dashboard, encontra o exame que queres praticar
2. Escolhe o modo:
   - **Practice**: Pratica livremente, vê respostas imediatamente
   - **Exam**: Simula o exame real com tempo e sem ver respostas
   - **Flashcards**: Revisa perguntas e respostas tipo cartas
3. Clica em "Start" e começa a praticar!

### 3. Importar JSONs do ExamTopics-4All

Se usares o portal examtopics-4all (porta 3000) para fazer download de exames via scraping:
1. Faz o download do JSON no portal 4all
2. Vai ao portal simple (porta 3001)
3. Importa o JSON através do JSON Importer
4. O exame aparece no teu Dashboard

## 🔧 Configuração

### Porta Personalizada
Para alterar a porta (padrão 3001), define a variável de ambiente:
```bash
PORT=3002 npm start
```

### Bind para Meshnet (Tailscale)
Para aceder apenas via meshnet (IP 100.96.178.158):
```bash
HOST=100.96.178.158 npm start
```

## 💾 Armazenamento de Dados

**Importante**: Todos os dados são guardados no **localStorage do teu browser**:
- Exames importados
- Histórico de prática
- Bookmarks
- Preferências de tema

Isto significa que:
- ✅ Cada utilizador tem os seus próprios dados
- ✅ Os dados persistem entre sessões no mesmo browser
- ⚠️ Se limpares o cache do browser, perdes os dados
- ⚠️ Se usares outro browser, não vês os exames importados anteriormente

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React + TypeScript
- **Build**: Vite
- **UI**: Bootstrap 5 + Lucide Icons
- **State**: React Hooks + LocalStorage
- **Backend**: Express.js (servidor estático)

## 📄 Estrutura do Projeto

```
examtopics-simple/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Dashboard.tsx   # Dashboard principal
│   │   ├── JsonImporter.tsx # Importador de JSON
│   │   └── ExamSimulator.tsx # Simulador de exames
│   ├── App.tsx             # Componente principal
│   └── types.ts            # Tipos TypeScript
├── server.ts               # Servidor Express
├── start.sh                # Script de arranque
└── README.md               # Este ficheiro
```

## 🤝 Contribuições

Este é um projeto pessoal para estudos de certificação. Sugestões e melhorias são bem-vindas!

## 📜 Licença

MIT License - usa à vontade para fins pessoais ou comerciais.

## ⚠️ Aviso Legal

Este portal destina-se apenas a fins de estudo e prática. Os dados importados devem ser obtidos de fontes legítimas. Respeita os termos de serviço do ExamTopics.com.

---

**Desenvolvido por:** André "Tinoco" Tinoco  
**Repositório:** https://github.com/TinocoAI/examtopics-simple  
**Versão:** 2.0.0  
**Data:** Julho 2026
