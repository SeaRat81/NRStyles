/** Server-only Cloudflare browser requests. Never return the API token to clients. */
export async function cloudflarePage(url:string,accountId:string,token:string,request:typeof fetch=fetch){
 if(!/^[a-f0-9]{32}$/i.test(accountId))throw Error('Cloudflare account ID is invalid.');
 const response=await request(`https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/content`,{
  method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify({url,setJavaScriptEnabled:true,gotoOptions:{waitUntil:'networkidle2',timeout:25000},waitForSelector:{selector:'h1',timeout:10000},waitForTimeout:2000}),
  signal:AbortSignal.timeout(45000)
 });
 if(response.status===429)throw Error('Cloudflare browser usage or request limit reached. Try later or enter the remaining details manually.');
 if(response.status===401||response.status===403)throw Error('Cloudflare browser connection needs attention. Check its account ID and token permissions.');
 if(!response.ok)throw Error('Cloudflare could not load the product page. Enter missing details manually.');
 const data:any=await response.json();
 if(!data.success||typeof data.result!=='string')throw Error('Cloudflare could not render this product page. Enter missing details manually.');
 if(data.meta?.status>=400)throw Error('The retailer blocked or could not serve the browser request. Enter missing details manually.');
 if(/we['’]ve noticed some unusual activity|access denied|verify you are human|robot check/i.test(data.result))throw Error('The retailer presented a security check instead of the product page. Enter missing details manually.');
 return data.result.slice(0,6000000);
}
