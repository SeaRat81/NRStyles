import type {RecordData} from './types';
export function shoppingGroups(items:RecordData[]){
 const groups=new Map<string,{key:string;name:string;items:RecordData[]}>();
 for(const item of items){
  if(item.removed||item.choice!=='now')continue;
  let key='unknown';try{key=new URL(item.url).hostname.toLowerCase().replace(/^www\./,'')}catch{}
  const name=key==='jcrew.com'?'J.Crew':key==='nordstrom.com'?'Nordstrom':key==='unknown'?'Other retailer':key;
  if(!groups.has(key))groups.set(key,{key,name,items:[]});groups.get(key)!.items.push(item);
 }
 return [...groups.values()];
}
