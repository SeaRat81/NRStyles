/** Server-only rendered HTML using the premium US proxy verified with both retailers. */
export async function scrapingBeePage(url:string,key:string,request:typeof fetch=fetch){
 const endpoint=new URL('https://app.scrapingbee.com/api/v1/');
 for(const [name,value] of Object.entries({url,render_js:'true',premium_proxy:'true',country_code:'us',wait_browser:'load',wait:'3000',timeout:'55000'}))endpoint.searchParams.set(name,value);
 const response=await request(endpoint,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(65000)});
 if(response.status===401||response.status===403)throw Error('ScrapingBee connection needs attention. Check the API key or available credits.');
 if(response.status===429)throw Error('ScrapingBee request limit reached. Try again shortly.');
 if(!response.ok)throw Error('ScrapingBee could not load this product page. Try again or enter missing details manually.');
 const html=(await response.text()).slice(0,6000000);
 if(/we['’]ve noticed some unusual activity|access denied|verify you are human|robot check/i.test(html))throw Error('The retailer returned a security check instead of the product page. Enter missing details manually.');
 return html;
}
