#!/usr/bin/env node
/**
 * Real ExamTopics scraper - fetches ALL exams from vendor page
 * Usage: node scrape-exams-real.js <vendor_name>
 * URL: https://www.examtopics.com/exams/<vendor>/
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function scrapeExams(vendorName) {
  try {
    // Converter nome do vendor para URL-friendly
    const vendorSlug = vendorName.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '');
    
    // URL correta do ExamTopics
    const url = `https://www.examtopics.com/exams/${vendorSlug}/`;
    
    console.error(`Fetching: ${url}`);
    const html = await fetchPage(url);
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const exams = [];
    
    // Estratégia 1: Procurar todos os links de exames na página
    const allLinks = doc.querySelectorAll('a[href*="/exams/"]');
    
    console.error(`Found ${allLinks.length} links with /exams/`);
    
    allLinks.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent.trim();
      
      // Filtrar apenas links deste vendor (não a página principal)
      if (href.includes(vendorSlug) && href !== `/exams/${vendorSlug}/`) {
        // Extrair o slug do exame do URL
        const match = href.match(/\/exams\/[^\/]+\/([^\/]+)\/?$/);
        if (match) {
          const examSlug = match[1];
          
          // Converter slug para código legível
          let code = examSlug.toUpperCase();
          let name = text || examSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          // Tentar extrair código do exame do slug (ex: 156-315-82 ou AIF-C01)
          const codeMatch = examSlug.match(/(\d{3}[-\.]\d{3}[-\.]\d{2}|\d{3}[-\.]\d{3}|[A-Z]{2,}-\d{2,}|[A-Z]{3,}\d{2,})/i);
          if (codeMatch) {
            code = codeMatch[1].toUpperCase();
          }
          
          exams.push({
            code: code,
            name: name,
            questionsCount: 0, // Será preenchido depois
            description: `Exam from ${vendorName}`,
            url: `https://www.examtopics.com${href}`
          });
        }
      }
    });
    
    // Estratégia 2: Procurar por padrões de códigos de exame no texto
    if (exams.length === 0) {
      console.error('No exam links found, trying alternative parsing...');
      
      const bodyText = doc.body.textContent;
      const codePatterns = [
        /\b(\d{3}[-\.]\d{3}[-\.]\d{2})\b/gi,  // 156-315-82
        /\b([A-Z]{2,}-\d{2,})\b/g,               // AIF-C01, AZ-104
        /\b([A-Z]{3,}\d{2,})\b/g,                // SAA-C03
      ];
      
      codePatterns.forEach((pattern) => {
        const matches = [...bodyText.matchAll(pattern)];
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
      });
    }
    
    // Remover duplicados
    const uniqueExams = [];
    const seen = new Set();
    exams.forEach((exam) => {
      if (!seen.has(exam.code)) {
        seen.add(exam.code);
        uniqueExams.push(exam);
      }
    });
    
    console.error(`Total unique exams found: ${uniqueExams.length}`);
    
    if (uniqueExams.length === 0) {
      console.error('No exams found via scraping, using static list as fallback');
      const staticExams = getStaticExamsForVendor(vendorName);
      console.log(JSON.stringify(staticExams));
    } else {
      console.log(JSON.stringify(uniqueExams));
    }
    
  } catch (err) {
    console.error('Scraping error:', err.message);
    // Fallback to static
    const staticExams = getStaticExamsForVendor(vendorName);
    console.log(JSON.stringify(staticExams));
  }
}

function getStaticExamsForVendor(vendor) {
  const vendorLower = vendor.toLowerCase();
  
  if (vendorLower.includes('check point') || vendorLower.includes('checkpoint')) {
    return [
      { code: '156-315.81', name: 'Check Point Certified Security Expert (CCSE) R81', questionsCount: 100, description: 'CCSE R81 exam' },
      { code: '156-215.81', name: 'Check Point Certified Security Administrator (CCSA) R81', questionsCount: 90, description: 'CCSA R81 exam' },
      { code: '156-110', name: 'Check Point Certified Security Principles Associate (CCSPA)', questionsCount: 80, description: 'CCSPA exam' },
    ];
  }
  
  if (vendorLower.includes('amazon') || vendorLower.includes('aws')) {
    return [
      { code: 'SAA-C03', name: 'AWS Certified Solutions Architect - Associate', questionsCount: 65, description: 'AWS SAA-C03' },
      { code: 'DVA-C02', name: 'AWS Certified Developer - Associate', questionsCount: 65, description: 'AWS DVA-C02' },
    ];
  }
  
  return [];
}

scrapeExams(vendor);
