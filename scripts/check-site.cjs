'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../dist');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(x => x[1]).filter(x => !x.startsWith('#'));
for (const value of urls) {
  const url = new URL(value, 'https://check.invalid/');
  assert.equal(url.origin, 'https://check.invalid', 'Runtime asset must be local: ' + value);
  assert.ok(fs.statSync(path.join(root, url.pathname)).isFile(), 'Missing asset: ' + value);
}
const context = vm.createContext({ console, URL });
for (const [, src] of html.matchAll(/<script[^>]+src="([^"]+)"/g)) {
  const name = src.split('?')[0];
  if (name !== 'engine.js' && !name.startsWith('bank-')) continue;
  vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), context, { filename: name });
}
const questions = context.QuizEngine.validateBank(context.SPORTS_BANK || []).questions;
assert.equal(questions.length, 610);
assert.equal(new Set(questions.map(q => q.id)).size, 610);
const sports = questions.filter(q => q.subject === '346 体育综合');
assert.equal(sports.length, 610);
for (const q of sports) assert.ok(q.textbookRefs.length && q.textbookRefs.every(r => r.printedPages?.length), q.id + ' printed reference');
const worker = vm.createContext({ URL, self: { location: { href: 'https://check.invalid/sw.js' }, addEventListener() {} } });
vm.runInContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), worker);
const shell = vm.runInContext('SHELL', worker);
for (const value of shell) {
  const url = new URL(value);
  assert.equal(url.origin, 'https://check.invalid');
  assert.ok(fs.existsSync(path.join(root, url.pathname === '/' ? 'index.html' : url.pathname)), 'Missing cached asset: ' + value);
}
const cached = new Set(shell.map(x => new URL(x).pathname + new URL(x).search));
for (const value of urls) {
  const url = new URL(value, 'https://check.invalid/');
  assert.ok(cached.has(url.pathname + url.search), 'HTML asset is absent from offline shell: ' + value);
}
console.log(JSON.stringify({ result: 'passed', questions: questions.length, professional: sports.length, offlineResources: shell.length }));
require('./check-words.cjs');
require('./check-study.cjs');
assert.equal(fs.readFileSync(path.join(root,'latest.html'),'utf8'),html,'Fresh entry must match current app');
require('node:child_process').execFileSync(process.execPath,[path.join(__dirname,'build-sports-revision.cjs'),'--check'],{stdio:'inherit'});
require('node:child_process').execFileSync(process.execPath,[path.join(__dirname,'build-knowledge.cjs'),'--check'],{stdio:'inherit'});
const knowledgeContext=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'knowledge-data.js'),'utf8'),knowledgeContext);
for(const link of knowledgeContext.KNOWLEDGE_DATA.bankLinks)assert.ok(questions.some(q=>q.id===link.bankId),'Unknown knowledge-bank link '+link.bankId);
const exam=require('../dist/exam-engine.js');
for(const bookKey of Object.keys(exam.BOOKS))for(const mode of ['mixed','single']){
  const paper=exam.createPaper(questions,{mode,bookKey,durationMinutes:180,seed:42});
  assert.equal(paper.questions.length,9);assert.equal(paper.questions.reduce((n,q)=>n+q.maxScore,0),100);exam.validatePublicPaper(exam.publicPaper(paper));
}
assert.ok(!cached.has('/exam-online.json'),'Online exam probe must never be precached');
assert.ok(!cached.has('/exam-config.json'),'Runtime exam connection must not use old offline configuration');
const examConfig=JSON.parse(fs.readFileSync(path.join(root,'exam-config.json'),'utf8'));
assert.equal(examConfig.version,1);assert.equal(typeof examConfig.apiBase,'string');
console.log(JSON.stringify({result:'passed',mockExam:{term:5,short:3,essay:1,totalScore:100,onlineGrading:true}}));
