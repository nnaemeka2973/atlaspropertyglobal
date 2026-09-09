const fs = require('fs');
const s = fs.readFileSync('providers/providerManager.js','utf8');
let stack = [];
const opens = '{([', closes = '})]';
for (let i=0;i<s.length;i++){
  const ch = s[i];
  if (opens.includes(ch)) stack.push({ch, i});
  else if (closes.includes(ch)){
    const expectedOpen = opens[closes.indexOf(ch)];
    const last = stack[stack.length-1];
    if (!last || last.ch !== expectedOpen){
      console.log('Mismatch at', i, 'char', ch, 'expected', expectedOpen, 'last', last);
      process.exit(0);
    }
    stack.pop();
  }
}
if (stack.length>0){
  console.log('Unmatched openings remain:', stack.map(x=>({ch:x.ch,pos:x.i})).slice(0,5));
} else console.log('All matched');
