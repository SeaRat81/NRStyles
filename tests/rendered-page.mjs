import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync('lib/nr/rendered-page.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const {cloudflarePage}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
let calls=0;
const account='a'.repeat(32);
const html=await cloudflarePage('https://www.jcrew.com/p/CX424',account,'test-secret',async(url,options)=>{
 calls++; assert.equal(url,`https://api.cloudflare.com/client/v4/accounts/${account}/browser-rendering/content`);
 const body=JSON.parse(options.body);assert.equal(body.setJavaScriptEnabled,true);assert.equal(body.gotoOptions.waitUntil,'networkidle2');assert.equal(body.waitForSelector.selector,'h1');assert.equal(body.waitForTimeout,2000);
 assert.equal(options.headers.Authorization,'Bearer test-secret');
 return Response.json({success:true,result:'<h1>Rendered product</h1>',meta:{status:200}});
});
assert.equal(html,'<h1>Rendered product</h1>');assert.equal(calls,1);
await assert.rejects(()=>cloudflarePage('https://www.jcrew.com',account,'test-secret',async()=>new Response('',{status:429})),/usage or request limit/);
await assert.rejects(()=>cloudflarePage('https://www.jcrew.com',account,'test-secret',async()=>Response.json({success:true,result:'Access denied',meta:{status:403}})),/retailer blocked/);
await assert.rejects(()=>cloudflarePage('https://www.jcrew.com','invalid','test-secret',async()=>{throw Error('must not request')}),/account ID/);
await assert.rejects(()=>cloudflarePage('https://www.nordstrom.com',account,'test-secret',async()=>Response.json({success:true,result:"<h1>We've noticed some unusual activity</h1>",meta:{status:200}})),/security check/);
console.log('PASS: browser rendering waits for JavaScript, keeps token server-side, and handles limits and blocked pages.');
