import {config,fail,productUrl,text} from './server';
import {mergeProductDetails} from './product-fields';
import {cloudflarePage} from './rendered-page';
import {scrapingBeePage} from './scrapingbee-page';
const hosts=['jcrew.com','www.jcrew.com','nordstrom.com','www.nordstrom.com'];
export function decode(s:string){return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)))}
export function parseProduct(html:string,url:string){const list:any[]=[];const collect=(v:any)=>{if(Array.isArray(v))v.forEach(collect);else if(v&&typeof v==='object'){if([v['@type']].flat().some(t=>t==='Product'))list.push(v);if(v['@graph'])collect(v['@graph'])}};for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{collect(JSON.parse(m[1]))}catch{try{collect(JSON.parse(decode(m[1])))}catch{}}}const u=new URL(url);const expected=u.searchParams.get('color_name')?.replace(/-/g,' ').toLowerCase();const p=list.find(p=>expected&&String(p.color).toLowerCase()===expected)||list[0]||{};const meta=(key:string)=>{for(const m of html.matchAll(/<meta\b[^>]*>/gi)){const tag=m[0];const name=tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];if(name===key)return decode(tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1]||'')}return ''};const offer=Array.isArray(p.offers)?p.offers[0]:p.offers;const visibleText=decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');const visiblePrice=visibleText.match(/Current Price\s*\$([\d,]+(?:\.\d{2})?)/i)?.[1]?.replace(/,/g,'');const rawPrice=offer?.price??offer?.lowPrice??(meta('product:price:amount')||visiblePrice);const price=rawPrice===''||rawPrice==null?null:Number(rawPrice);const mainImage=[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]).find(t=>/alt=["'][^"']*Main, color,/i.test(t));const mainSrc=mainImage?.match(/src=["']([^"']+)["']/i)?.[1];const mainColor=mainImage?.match(/alt=["'][^"']*Main, color, ([^"']+)["']/i)?.[1];const img=Array.isArray(p.image)?p.image[0]:p.image;const h1=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g,'').trim();const name=text(p.name||meta('og:title')||decode(h1||''),250).replace(/\s*[|–]\s*(J\.Crew|Nordstrom).*$/i,'');return {name,price:Number.isFinite(price)?price:null,currency:offer?.priceCurrency||meta('product:price:currency')||'USD',image:img&&typeof img==='object'?img.url:img||meta('og:image')||decode(mainSrc||''),brand:typeof p.brand==='object'?p.brand.name:p.brand||'',color:p.color||mainColor||u.searchParams.get('color_name')?.replace(/-/g,' ')||'',url,category:u.pathname.includes('sweater')?'Sweaters & Knitwear':u.pathname.includes('jeans')?'Jeans':'Other'}}
export async function importProduct(s:string){
 const started=performance.now();
 const timings={requestId:crypto.randomUUID(),recordedAt:new Date().toISOString(),retailer:'',directMs:0,renderMs:0,extractMs:0,totalMs:0,provider:'none',directStatus:null as number|null,renderAttempted:false,renderSucceeded:false};
 const original=productUrl(s);timings.retailer=original.hostname;
 if(original.hostname==='localhost'||/^[0-9.]+$/.test(original.hostname)||original.hostname.startsWith('['))fail(400,'Use a retailer website link.');
 const u=new URL(original);
 let html='';
 let fetchFailed=false;
 let readStatus:number|null=null;
 let renderingError='';
 const scrapingBeeConfigured=!!config('SCRAPINGBEE_API_KEY');
 const cloudflareConfigured=!!(config('CLOUDFLARE_ACCOUNT_ID')&&config('CLOUDFLARE_BROWSER_TOKEN'));
 const supported=hosts.includes(u.hostname)&&!u.port;
 if(supported){
  const directStarted=performance.now();
  try{
   for(let step=0;step<4;step++){
    const response=await fetch(u.toString(),{redirect:'manual',headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'},signal:AbortSignal.timeout(15000)});
    if(response.status>=300&&response.status<400){const next=new URL(response.headers.get('location')||'',u);if(next.protocol!=='https:'||!hosts.includes(next.hostname)||next.port)break;u.href=next.href;continue}
    readStatus=response.status;
    if(!response.ok){fetchFailed=true;break;}
    if(Number(response.headers.get('content-length')||0)>6000000)break;
    const reader=response.body?.getReader();if(!reader)break;
    const chunks:Uint8Array[]=[];let count=0;
    while(true){const part=await reader.read();if(part.done)break;count+=part.value.length;if(count>6000000){await reader.cancel();throw Error('Page too large')}chunks.push(part.value)}
    const bytes=new Uint8Array(count);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length}html=new TextDecoder().decode(bytes);break;
   }
  }catch{fetchFailed=true}
  finally{timings.directMs=Math.round(performance.now()-directStarted);timings.directStatus=readStatus;}
 }
 if(/we['’]ve noticed some unusual activity|access denied|verify you are human|robot check/i.test(html)){html='';fetchFailed=true;}
 let extractStarted=performance.now();
 let item=parseProduct(html,original.toString());
 timings.extractMs+=performance.now()-extractStarted;
 if(supported&&(!item.name||!item.image||item.price===null)&&(scrapingBeeConfigured||cloudflareConfigured)){
  timings.renderAttempted=true;timings.provider=scrapingBeeConfigured?'ScrapingBee premium US':'Cloudflare';
  const renderStarted=performance.now();
  try{
   const page=scrapingBeeConfigured?await scrapingBeePage(original.toString(),config('SCRAPINGBEE_API_KEY')):await cloudflarePage(original.toString(),config('CLOUDFLARE_ACCOUNT_ID'),config('CLOUDFLARE_BROWSER_TOKEN'));
   timings.renderMs=Math.round(performance.now()-renderStarted);timings.renderSucceeded=true;
   extractStarted=performance.now();
   item={...item,...mergeProductDetails(item,parseProduct(page,original.toString()))};
   timings.extractMs+=performance.now()-extractStarted;
  }catch(e){timings.renderMs=Math.round(performance.now()-renderStarted);renderingError=(e as Error).name==='TimeoutError'?'The retailer took too long to load. Try again or enter missing details manually.':(e as Error).message;}
 }
 const complete=!!(item.name&&item.image&&item.price!==null);
 const rendererConfigured=cloudflareConfigured||!!config('SCRAPINGBEE_API_KEY');
 const blocked=readStatus===403||readStatus===429||/access denied|captcha|verify you are human|robot check/i.test(html.slice(0,100000));
 const warning=complete?'':!supported?'Automatic import is not available for this retailer. You can enter the product details below.':renderingError?renderingError:blocked?'The retailer blocked the automated page request. Available details have been kept; enter missing fields manually.':!rendererConfigured?'Only the initial page HTML could be read; browser-rendered importing is not configured yet. Available details have been kept; enter missing fields manually.':fetchFailed?'The retailer could not be fully read. Any available details have been kept; enter the rest below.':'Some product details could not be imported. Enter the missing name or price below; the image and other details are optional.';
 timings.extractMs=Math.round(timings.extractMs);timings.totalMs=Math.round(performance.now()-started);
 console.info('nrstyles.product_import',JSON.stringify({...timings,complete}));
 return {item,complete,warning,timings};
}
