#!/usr/bin/env node
/**
 * Scrape vendors from ExamTopics.com
 * Fetches the main page and extracts vendor list from the dropdown
 */

import https from 'https';
import { JSDOM } from 'jsdom';

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function scrapeVendors() {
  try {
    const html = await fetchPage('https://www.examtopics.com/');
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const vendors = [];
    const select = doc.querySelector('select[name="provider"]') || 
                   doc.querySelector('#provider-select') ||
                   doc.querySelector('select');
    
    if (select) {
      const options = select.querySelectorAll('option');
      options.forEach((opt, idx) => {
        if (idx === 0) return; // Skip "Select Provider"
        
        const name = opt.textContent.trim();
        const value = opt.value.toLowerCase().replace(/\s+/g, '-');
        
        // Assign icon and category based on name
        let icon = '📦';
        let color = 'bg-gray-500';
        let category = 'Other';
        
        if (name.includes('Amazon')) { icon = '☁️'; color = 'bg-amber-500'; category = 'Cloud'; }
        else if (name.includes('Microsoft')) { icon = '💠'; color = 'bg-blue-600'; category = 'Cloud & OS'; }
        else if (name.includes('Google')) { icon = '⚡'; color = 'bg-emerald-500'; category = 'Cloud'; }
        else if (name.includes('Cisco')) { icon = '🌐'; color = 'bg-indigo-500'; category = 'Networking'; }
        else if (name.includes('CompTIA')) { icon = '🛠️'; color = 'bg-emerald-600'; category = 'Foundational'; }
        else if (name.includes('Check Point')) { icon = '🔐'; color = 'bg-red-600'; category = 'Security'; }
        else if (name.includes('Aruba')) { icon = '📡'; color = 'bg-blue-500'; category = 'Networking'; }
        else if (name.includes('Salesforce')) { icon = '☁️'; color = 'bg-sky-400'; category = 'CRM / SaaS'; }
        else if (name.includes('VMware')) { icon = '🖥️'; color = 'bg-teal-600'; category = 'Virtualization'; }
        else if (name.includes('Oracle')) { icon = '📊'; color = 'bg-red-600'; category = 'Database & Cloud'; }
        else if (name.includes('RedHat') || name.includes('Red Hat')) { icon = '🎩'; color = 'bg-red-700'; category = 'Linux / DevOps'; }
        else if (name.includes('HashiCorp')) { icon = '🔑'; color = 'bg-violet-600'; category = 'DevOps'; }
        else if (name.includes('Linux')) { icon = '🐧'; color = 'bg-zinc-800'; category = 'Linux & Kubernetes'; }
        else if (name.includes('PMI')) { icon = '📈'; color = 'bg-pink-600'; category = 'Project Management'; }
        else if (name.includes('ISACA')) { icon = '🛡️'; color = 'bg-cyan-700'; category = 'Security / Audit'; }
        else if (name.includes('ISC2')) { icon = '🔐'; color = 'bg-yellow-600'; category = 'Cybersecurity'; }
        else if (name.includes('Palo Alto')) { icon = '🧱'; color = 'bg-orange-600'; category = 'Security'; }
        else if (name.includes('Fortinet')) { icon = '🛡️'; color = 'bg-rose-600'; category = 'Security'; }
        else if (name.includes('Splunk')) { icon = '🖤'; color = 'bg-zinc-900'; category = 'Monitoring'; }
        else if (name.includes('Snowflake')) { icon = '❄️'; color = 'bg-cyan-400'; category = 'Data Warehouse'; }
        else if (name.includes('Docker')) { icon = '🐳'; color = 'bg-blue-400'; category = 'Containers'; }
        else if (name.includes('Atlassian')) { icon = '🎯'; color = 'bg-blue-500'; category = 'Agile / Collab'; }
        else if (name.includes('Nutanix')) { icon = '🟢'; color = 'bg-green-700'; category = 'Virtualization'; }
        else if (name.includes('F5')) { icon = '🔴'; color = 'bg-red-500'; category = 'Networking'; }
        else if (name.includes('Citrix')) { icon = '💻'; color = 'bg-blue-700'; category = 'Virtualization'; }
        else if (name.includes('Scrum')) { icon = '🏉'; color = 'bg-indigo-600'; category = 'Agile'; }
        
        vendors.push({
          id: value,
          name: name,
          icon: icon,
          color: color,
          category: category
        });
      });
    }
    
    console.log(JSON.stringify(vendors));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

scrapeVendors();
