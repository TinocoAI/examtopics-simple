#!/usr/bin/env node
/**
 * Real ExamTopics scraper - fetches ALL exams from vendor page
 * Usage: node scrape-exams-v2.js <vendor_name>
 * URL: https://www.examtopics.com/exams/<vendor_slug>/
 */

import https from 'https';
import { JSDOM } from 'jsdom';

const vendor = process.argv[2];

if (!vendor) {
  console.error('Please provide a vendor name');
  process.exit(1);
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cookie': 'csrftoken=; sessionid='
      }
    };
    
    https.get(url, options, (res) => {
      // Seguir redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchPage(res.headers.location);
      }
      
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function scrapeExams(vendorName) {
  try {
    // Converter vendor para slug (tratar espaços e caracteres especiais)
    const vendorSlug = vendorName.toLowerCase()
      .replace(/\s+/g, '')            // remover espaços (check point → checkpoint)
      .replace(/[^\w]/g, '')          // remover caracteres especiais
      .replace(/-+/g, '-');          // hífens normais
    
    const url = `https://www.examtopics.com/exams/${vendorSlug}/`;
    
    console.error(`[SCRAPER] Fetching: ${url}`);
    const html = await fetchPage(url);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const exams = [];
    
    // Estratégia 1: Procurar TODOS os links com /exams/<vendor>/
    const allLinks = doc.querySelectorAll(`a[href*="/exams/${vendorSlug}/"]`);
    
    console.error(`[SCRAPER] Found ${allLinks.length} links containing /exams/${vendorSlug}/`);
    
    allLinks.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent.trim();
      
      // Filtrar apenas links de exames individuais (não a página principal)
      // Padrão: /exams/<vendor>/<exam-code>/
      const examPattern = new RegExp(`^/exams/${vendorSlug}/([^/]+)/$`);
      const match = href.match(examPattern);
      
      if (match) {
        const examSlug = match[1];
        
        // Extrair código do exame do slug
        // Ex: 156-215-82, 156-315-82, saa-c03, az-104
        let code = examSlug;
        
        // Normalizar: trocar pontos por hífens (156.110 → 156-110)
        code = code.replace(/\./g, '-');
        
        // Tentar extrair o código real se o slug tiver prefixos
        // Ex: "check-point-156-215-82" → "156-215-82"
        const codeMatch = code.match(/(\d{3}[-\d]+|\w{2,}-\d{2,})/);
        if (codeMatch) {
          code = codeMatch[1].toUpperCase();
        }
        
        // Tentar extrair nome do exame do texto do link
        let name = text || `${vendorName} ${code}`;
        
        // Limpar o nome (remover "Checkpoint 156-215.82:" do início)
        name = name.replace(/^checkpoint\s+\d{3}[-\.]\d{3}[-\.]?\d{0,2}:?\s*/i, '');
        name = name.replace(/^\w+\s+\d{3}[-\.]\d{3}[-\.]?\d{0,2}:?\s*/i, '');
        
        if (!exams.find(e => e.code === code)) {
          exams.push({
            code: code,
            name: name || `${vendorName} ${code}`,
            questionsCount: 0,
            description: `Certification exam from ${vendorName}`,
            url: `https://www.examtopics.com${href}`
          });
        }
      }
    });
    
    // Estratégia 2: Se não encontrou nada, procurar por padrões de códigos no texto
    if (exams.length === 0) {
      console.error('[SCRAPER] No exam links found, trying regex pattern matching...');
      
      const bodyText = doc.body.textContent;
      const codeRegex = /(\d{3}[-\.]\d{3}[-\.]?\d{0,2}|[A-Z]{2,}-\d{2,}|[A-Z]{3,}\d{2,})/gi;
      const matches = [...bodyText.matchAll(codeRegex)];
      
      matches.forEach((match) => {
        const code = match[1].toUpperCase();
        if (!exams.find(e => e.code === code)) {
          exams.push({
            code: code,
            name: `${vendorName} ${code}`,
            questionsCount: 0,
            description: `Certification exam`,
            url: ''
          });
        }
      });
    }
    
    console.error(`[SCRAPER] Total unique exams found: ${exams.length}`);
    
    if (exams.length === 0) {
      console.error('[SCRAPER] No exams found via scraping, using static list as fallback');
      const staticExams = getStaticExamsForVendor(vendorName);
      console.log(JSON.stringify(staticExams));
    } else {
      console.log(JSON.stringify(exams));
    }
    
  } catch (err) {
    console.error('[SCRAPER] Error:', err.message);
    // Fallback to static
    const staticExams = getStaticExamsForVendor(vendorName);
    console.log(JSON.stringify(staticExams));
  }
}

function getStaticExamsForVendor(vendor) {
  const vendorLower = vendor.toLowerCase();
  
  // Lista estática completa baseada na pesquisa real no ExamTopics
  if (vendorLower.includes('check') && vendorLower.includes('point')) {
    return [
      { code: '156-215.82', name: 'Check Point Certified Security Administrator R82 (CCSA)', questionsCount: 90, description: 'CCSA R82' },
      { code: '156-315.82', name: 'Check Point Certified Security Expert R82 (CCSE)', questionsCount: 100, description: 'CCSE R82' },
      { code: '156-215.81', name: 'Check Point Certified Security Administrator R81 (CCSA)', questionsCount: 90, description: 'CCSA R81' },
      { code: '156-315.81', name: 'Check Point Certified Security Expert R81 (CCSE)', questionsCount: 100, description: 'CCSE R81' },
      { code: '156-110', name: 'Check Point Certified Security Principles Associate (CCSPA)', questionsCount: 80, description: 'CCSPA' },
    ];
  }
  
  if (vendorLower.includes('amazon') || vendorLower.includes('aws')) {
    return [
      { code: 'SAA-C03', name: 'AWS Certified Solutions Architect - Associate', questionsCount: 65, description: 'AWS SAA-C03' },
      { code: 'DVA-C02', name: 'AWS Certified Developer - Associate', questionsCount: 65, description: 'AWS DVA-C02' },
      { code: 'SOA-C02', name: 'AWS Certified SysOps Administrator - Associate', questionsCount: 65, description: 'AWS SOA-C02' },
      { code: 'SAP-C02', name: 'AWS Certified Solutions Architect - Professional', questionsCount: 75, description: 'AWS SAP-C02' },
    ];
  }
  
  return [];
}

scrapeExams(vendor);
