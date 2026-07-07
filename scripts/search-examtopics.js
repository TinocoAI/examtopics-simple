#!/usr/bin/env node
/**
 * Search ExamTopics.com for vendors or exams
 * Usage: node search-examtopics.js <query>
 * Returns: { vendors: [], exams: [] }
 */

import https from 'https';
import { JSDOM } from 'jsdom';

const query = process.argv[2];

if (!query) {
  console.error('Please provide a search query');
  process.exit(1);
}

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function searchExamTopics(searchQuery) {
  try {
    const results = { vendors: [], exams: [] };
    
    // Strategy 1: Search vendors by checking the main page dropdown
    const mainPage = await fetchPage('https://www.examtopics.com/');
    const mainDom = new JSDOM(mainPage);
    const mainDoc = mainDom.window.document;
    
    // Look for vendor names in the page
    const pageText = mainDoc.body.textContent.toLowerCase();
    const queryLower = searchQuery.toLowerCase();
    
    // Check if query matches any known vendor patterns
    const vendorMatches = [
      'Amazon', 'Microsoft', 'Google', 'Cisco', 'CompTIA', 
      'Check Point', 'Aruba', 'Salesforce', 'VMware', 'Oracle',
      'RedHat', 'HashiCorp', 'Linux Foundation', 'PMI', 
      'ISACA', 'ISC2', 'Palo Alto', 'Fortinet', 'Splunk',
      'Snowflake', 'Docker', 'Atlassian', 'Nutanix', 'F5',
      'Citrix', 'Scrum.org'
    ];
    
    const matchedVendors = vendorMatches.filter(v => 
      v.toLowerCase().includes(queryLower) || 
      queryLower.includes(v.toLowerCase())
    );
    
    matchedVendors.forEach(vendor => {
      const vendorSlug = vendor.toLowerCase().replace(/\s+/g, '-');
      results.vendors.push({
        id: vendorSlug,
        name: vendor,
        icon: getIconForVendor(vendor),
        color: getColorForVendor(vendor),
        category: getCategoryForVendor(vendor)
      });
    });
    
    // Strategy 2: Try to search for exams directly
    // This would need a more sophisticated approach (using their search API if exists)
    // For now, return vendor matches
    
    console.log(JSON.stringify(results));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

function getIconForVendor(vendor) {
  const icons = {
    'Amazon': '☁️', 'Microsoft': '💠', 'Google': '⚡', 'Cisco': '🌐',
    'CompTIA': '🛠️', 'Check Point': '🔐', 'Aruba': '📡',
    'VMware': '🖥️', 'Oracle': '📊', 'RedHat': '🎩',
    'HashiCorp': '🔑', 'Linux Foundation': '🐧', 'PMI': '📈',
    'ISACA': '🛡️', 'ISC2': '🔐', 'Palo Alto': '🧱',
    'Fortinet': '🛡️', 'Splunk': '🖤', 'Snowflake': '❄️',
    'Docker': '🐳', 'Atlassian': '🎯', 'Nutanix': '🟢',
    'F5': '🔴', 'Citrix': '💻', 'Scrum.org': '🏉'
  };
  return icons[vendor] || '📦';
}

function getColorForVendor(vendor) {
  const colors = {
    'Amazon': 'bg-amber-500', 'Microsoft': 'bg-blue-600', 'Google': 'bg-emerald-500',
    'Cisco': 'bg-indigo-500', 'CompTIA': 'bg-emerald-600', 'Check Point': 'bg-red-600',
    'Aruba': 'bg-blue-500', 'VMware': 'bg-teal-600', 'Oracle': 'bg-red-600',
    'RedHat': 'bg-red-700', 'HashiCorp': 'bg-violet-600', 'Linux Foundation': 'bg-zinc-800',
    'PMI': 'bg-pink-600', 'ISACA': 'bg-cyan-700', 'ISC2': 'bg-yellow-600',
    'Palo Alto': 'bg-orange-600', 'Fortinet': 'bg-rose-600', 'Splunk': 'bg-zinc-900',
    'Snowflake': 'bg-cyan-400', 'Docker': 'bg-blue-400', 'Atlassian': 'bg-blue-500',
    'Nutanix': 'bg-green-700', 'F5': 'bg-red-500', 'Citrix': 'bg-blue-700',
    'Scrum.org': 'bg-indigo-600'
  };
  return colors[vendor] || 'bg-gray-500';
}

function getCategoryForVendor(vendor) {
  const categories = {
    'Amazon': 'Cloud', 'Microsoft': 'Cloud & OS', 'Google': 'Cloud',
    'Cisco': 'Networking', 'CompTIA': 'Foundational', 'Check Point': 'Security',
    'Aruba': 'Networking', 'VMware': 'Virtualization', 'Oracle': 'Database & Cloud',
    'RedHat': 'Linux / DevOps', 'HashiCorp': 'DevOps', 'Linux Foundation': 'Linux & Kubernetes',
    'PMI': 'Project Management', 'ISACA': 'Security / Audit', 'ISC2': 'Cybersecurity',
    'Palo Alto': 'Security', 'Fortinet': 'Security', 'Splunk': 'Monitoring',
    'Snowflake': 'Data Warehouse', 'Docker': 'Containers', 'Atlassian': 'Agile / Collab',
    'Nutanix': 'Virtualization', 'F5': 'Networking', 'Citrix': 'Virtualization',
    'Scrum.org': 'Agile'
  };
  return categories[vendor] || 'Other';
}

searchExamTopics(query);
