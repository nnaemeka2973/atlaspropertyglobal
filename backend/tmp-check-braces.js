const fs = require('fs');
const s = fs.readFileSync('providers/providerManager.js','utf8');
const counts = { '{':0, '}':0, '(':0, ')':0, '[':0, ']':0 };
for (const ch of s) if (counts.hasOwnProperty(ch)) counts[ch]++;
console.log('counts', counts);

// find last non-whitespace char and print tail
let i = s.length-1; while (i>=0 && /\s/.test(s[i])) i--; 
console.log('lastChar:', s[i]||'EOF', 'at pos', i);
console.log('tail 200:', s.slice(Math.max(0,s.length-200)));
