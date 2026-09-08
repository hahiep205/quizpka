const fs = require("node:fs");
const path = require("node:path");
const dir = path.join(__dirname, "..", "public", "data", "chu-nghia-khoa-hoc-xa-hoi");
const order = ["chuong_1.json","chuong_2.json","chuong_3.json","chuong_4.json","chuong_5.json","chuong_6.json","chuong_7.json"];
let all=[];
for(const f of order){ const d=JSON.parse(fs.readFileSync(path.join(dir,f),"utf8")); for(const q of d.questions) all.push(q); }
const mid = all.filter(q=>/^Chương [1-4]/.test(q.chapter));
const counts={}; mid.forEach(q=>counts[q.chapter]=(counts[q.chapter]||0)+1);
const outDir=path.join(__dirname,"..","public","data","chu-nghia-khoa-hoc-xa-hoi-giua-ky");
fs.mkdirSync(outDir,{recursive:true});
fs.writeFileSync(path.join(outDir,"soc_giua_ky.json"), JSON.stringify({questions:mid}));
console.log("mid="+mid.length, JSON.stringify(counts));
const outPaid=path.join(__dirname,"..","supabase","paid-banks","soc101_chu_nghia_xa_hoi.json");
fs.mkdirSync(path.dirname(outPaid),{recursive:true});
fs.writeFileSync(outPaid, JSON.stringify({questions: all.map((q,i)=>({...q, id:i+1}))}));
console.log("paid="+all.length+" bytes="+fs.statSync(outPaid).size);
