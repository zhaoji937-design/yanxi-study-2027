'use strict';
// All OpenAI credentials stay on this service. The existing frontend remains on its original origin.
const http=require('node:http'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const E=require('../dist/exam-engine.js');
const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/sports-revised.json'),'utf8'));
const BANK=Array.isArray(source)?source:source.questions;
const BANK_VERSION=crypto.createHash('sha256').update(JSON.stringify(BANK)).digest('hex').slice(0,20);
class ClientError extends Error{constructor(status,message){super(message);this.status=status;}}
function createService(options={}){
  const env=options.env||process.env,now=options.now||Date.now,fetcher=options.fetch||fetch;
  const allowed=new Set((env.EXAM_ALLOWED_ORIGINS||'https://yanxi-study-2027.onrender.com').split(',').map(s=>s.trim()).filter(Boolean));
  const signing=env.EXAM_SIGNING_SECRET||'',access=env.EXAM_ACCESS_CODE||'',apiKey=env.OPENAI_API_KEY||'',model=env.OPENAI_MODEL||'gpt-5.4';
  const jobs=new Map(),limits=new Map(),maxDaily=Number(env.EXAM_DAILY_LIMIT)||8;
  const configured=()=>signing.length>=32&&access.length>=12&&apiKey.length>10;
  function sign(value){const payload=Buffer.from(JSON.stringify(value)).toString('base64url');return payload+'.'+crypto.createHmac('sha256',signing).update(payload).digest('base64url');}
  function verify(token,kind){
    if(typeof token!=='string'||token.length>850000)throw new ClientError(400,'考试凭证不完整。');
    const parts=token.split('.');if(parts.length!==2)throw new ClientError(400,'考试凭证不正确。');
    const expected=crypto.createHmac('sha256',signing).update(parts[0]).digest(),supplied=Buffer.from(parts[1],'base64url');
    if(expected.length!==supplied.length||!crypto.timingSafeEqual(expected,supplied))throw new ClientError(400,'考试凭证校验失败，不能修改试卷、时限或已交答卷。');
    let data;try{data=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));}catch{throw new ClientError(400,'考试凭证无法读取。');}
    if(data.kind!==kind||data.bankVersion!==BANK_VERSION||data.version!==1)throw new ClientError(409,'试卷版本不一致，请先保留答卷。');
    return data;
  }
  function auth(req){
    if(!configured())throw new ClientError(503,'在线AI评阅尚未配置完成，不能开始自动评阅考试。可以先使用ChatGPT网页评阅方式。');
    const value=(req.headers.authorization||'').replace(/^Bearer /,'');
    const a=crypto.createHash('sha256').update(value).digest(),b=crypto.createHash('sha256').update(access).digest();
    if(!value||!crypto.timingSafeEqual(a,b))throw new ClientError(401,'访问口令不正确或已过期，请重新输入。');
  }
  function rate(key,max,window){const record=limits.get(key)||{n:0,until:now()+window};if(now()>record.until){record.n=0;record.until=now()+window;}if(++record.n>max)throw new ClientError(429,'操作过于频繁，请稍后重试；已保存的答卷不会改动。');limits.set(key,record);if(limits.size>2000)for(const [k,v]of limits)if(v.until<now())limits.delete(k);}
  function paper(token){const meta=verify(token,'paper');if(now()-meta.createdAt>7*86400000)throw new ClientError(410,'该试卷已超过在线评阅保留期限，请导出答卷。');return E.paperFromIds(BANK,meta);}
  function receiptFrom(p,answers,auto){return sign({kind:'submission',version:1,bankVersion:BANK_VERSION,paperId:p.id,paper:{...p,questions:undefined,ids:p.questions.map(q=>q.id)},answers,submittedAt:now(),auto});}
  function respond(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
  async function read(req){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>1024*1024)throw new ClientError(413,'答卷超过容量限制。');chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw new ClientError(400,'请求不是有效JSON。');}}
  async function grade(p,answers,fingerprint){
    const payload={model,store:false,reasoning:{effort:'high'},max_output_tokens:24000,input:[{role:'developer',content:E.instructions()},{role:'user',content:JSON.stringify(E.packet(p,answers,fingerprint))}],text:{format:{type:'json_schema',name:'yanxi_exam_grade',strict:true,schema:E.schema()}}};
    const response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(240000)});
    if(!response.ok){if([401,403].includes(response.status))throw new Error('AI服务的授权配置有误，请检查服务器配置后重试。');if(response.status===429)throw new Error('AI服务额度不足或请求限流，请检查额度后重试。');throw new Error('AI服务暂时无法评阅，请稍后重试。');}
    const data=await response.json();if(data.status!=='completed')throw new Error('AI评阅尚未完整结束，没有生成分数；请稍后重试。');
    const output=(data.output||[]).flatMap(item=>item.content||[]);if(output.some(item=>item.type==='refusal'))throw new Error('AI服务未能评阅这份答卷，没有生成分数。');
    const content=output.filter(item=>item.type==='output_text').map(item=>item.text).join('');
    const result=E.validateGrade(E.parseJSON(content),p,answers,fingerprint);
    return {grade:result,provenance:{kind:'openai-api',model:data.model||model,reviewedAt:new Date(now()).toISOString(),responseId:data.id||''}};
  }
  async function handle(req,res){
    const origin=req.headers.origin;
    if(origin&&!allowed.has(origin)){respond(res,403,{error:'该网站没有访问此评阅服务的权限。'});return;}
    if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Max-Age','300');}
    if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
    try{
      const url=new URL(req.url,'http://local');
      if(req.method==='GET'&&url.pathname==='/api/health'){respond(res,200,{app:'yanxi-exam-api',version:1,ready:configured(),serverNow:now(),rubricVersion:E.RUBRIC_VERSION,bankVersion:BANK_VERSION,model:configured()?model:null});return;}
      if(req.method==='GET'&&url.pathname==='/api/exams/clock'){respond(res,200,{app:'yanxi-exam-clock',serverNow:now(),nonce:url.searchParams.get('nonce')||''});return;}
      const ip=req.socket.remoteAddress||'';rate('requests:'+ip,240,60000);auth(req);
      if(req.method==='POST'&&url.pathname==='/api/exams/auth'){respond(res,200,{ok:true,serverNow:now()});return;}
      if(req.method==='POST'&&url.pathname==='/api/exams/start'){
        rate('starts:'+ip,12,3600000);const body=await read(req);
        const p=E.createPaper(BANK,{mode:body.mode,bookKey:body.bookKey,durationMinutes:body.durationMinutes,excludeIds:Array.isArray(body.excludeIds)?body.excludeIds.slice(0,100):[],seed:crypto.randomBytes(4).readUInt32LE(),id:'exam-'+crypto.randomUUID()},now());
        const token=sign({kind:'paper',version:1,bankVersion:BANK_VERSION,...p,questions:undefined,ids:p.questions.map(q=>q.id)});
        const checkpoint=sign({kind:'checkpoint',version:1,bankVersion:BANK_VERSION,paperId:p.id,answers:E.answersFor(p,{}),revision:0,acceptedAt:now()});
        respond(res,201,{paper:E.publicPaper(p),token,checkpoint,serverNow:now()});return;
      }
      if(req.method==='POST'&&url.pathname==='/api/exams/draft'){
        const body=await read(req),p=paper(body.token);if(now()>=p.deadline)throw new ClientError(409,'考试已到时，不能再更改答案。');
        if(!Number.isSafeInteger(body.revision)||body.revision<1)throw new ClientError(400,'答卷版本不正确。');
        const answers=E.answersFor(p,body.answers),checkpoint=sign({kind:'checkpoint',version:1,bankVersion:BANK_VERSION,paperId:p.id,answers,revision:body.revision,acceptedAt:now()});
        respond(res,200,{checkpoint,revision:body.revision,acceptedAt:now(),serverNow:now()});return;
      }
      if(req.method==='POST'&&url.pathname==='/api/exams/submit'){
        const body=await read(req),p=paper(body.token);let answers,fromCheckpoint=false;
        if(now()<p.deadline){answers=E.answersFor(p,body.answers);}else{
          const cp=verify(body.checkpoint,'checkpoint');if(cp.paperId!==p.id||cp.acceptedAt>=p.deadline)throw new ClientError(409,'没有可验证的考前答卷，请保留本地草稿联系核对。');answers=E.answersFor(p,cp.answers);fromCheckpoint=true;
        }
        respond(res,200,{receipt:receiptFrom(p,answers,body.auto===true||fromCheckpoint),answers,serverNow:now(),submittedAt:now(),fromCheckpoint,paper:E.publicPaper(p)});return;
      }
      if(req.method==='POST'&&url.pathname==='/api/exams/grade'){
        const body=await read(req),submission=verify(body.receipt,'submission'),p=E.paperFromIds(BANK,submission.paper),answers=E.answersFor(p,submission.answers);
        if(now()-submission.submittedAt>7*86400000)throw new ClientError(410,'这份已交答卷超过7天在线评阅期限，请保留备份。');
        const fingerprint=await E.digest(p,answers),id=crypto.createHash('sha256').update(p.id+fingerprint).digest('hex').slice(0,32);
        const existing=jobs.get(id);if(existing?.state==='running'||existing?.state==='done'){respond(res,202,{jobId:id,answerDigest:fingerprint});return;}
        if([...jobs.values()].some(j=>j.state==='running'))throw new ClientError(429,'评阅服务正在批改另一份试卷，请稍后重试。');
        rate('grading-day',maxDaily,86400000);rate('grading:'+ip,4,3600000);
        for(const [k,v]of jobs)if(now()-v.createdAt>2*3600000)jobs.delete(k);
        const job={state:'running',createdAt:now(),paperId:p.id,answerDigest:fingerprint};jobs.set(id,job);
        grade(p,answers,fingerprint).then(result=>{job.state='done';job.result={...result,reference:p.questions.map(q=>({id:q.id,answer:q.referenceAnswer,textbookRefs:q.textbookRefs,rubric:q.rubric}))};}).catch(err=>{job.state='failed';job.error=err.name==='TimeoutError'?'AI评阅超时，没有生成分数。答卷已锁定保存，可以重试。':err.message||'评阅未完成，请重试。';});
        respond(res,202,{jobId:id,answerDigest:fingerprint});return;
      }
      if(req.method==='GET'&&/^\/api\/exams\/jobs\/[a-f0-9]{32}$/.test(url.pathname)){
        const job=jobs.get(url.pathname.split('/').at(-1));if(!job)throw new ClientError(404,'服务重启或评阅任务已过期，请重新发起评阅；答卷保持不变。');
        respond(res,200,{state:job.state,paperId:job.paperId,answerDigest:job.answerDigest,...(job.result||{}),...(job.error?{error:job.error}:{})});return;
      }
      throw new ClientError(404,'没有找到该考试接口。');
    }catch(err){respond(res,err.status||400,{error:err.status||err.message?.length<300?err.message:'操作没有完成，请稍后重试。'});}
  }
  const server=http.createServer((req,res)=>{handle(req,res).catch(()=>{if(!res.headersSent)respond(res,500,{error:'评阅服务暂时不可用。'});else res.end();});});
  server.requestTimeout=30000;server.headersTimeout=15000;
  return {server,handle,configured,jobs};
}
if(require.main===module){const service=createService();service.server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Yanxi exam API listening; grading '+(service.configured()?'configured':'awaiting setup')+'.'));}
module.exports={createService,BANK_VERSION};
