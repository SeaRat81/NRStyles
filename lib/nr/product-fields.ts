/** Fill missing fields without erasing a stylist's manual entries. */
export function mergeProductDetails(existing:Record<string,any>,imported:Record<string,any>={}){
 const result={...existing};
 for(const key of ['name','brand','color','image','currency']){
  const value=imported[key];
  if(typeof value!=='string'||!value.trim()||String(result[key]??'').trim())continue;
  if(key==='image'){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)continue}catch{continue}}
  if(key==='currency'&&value.toUpperCase()!=='USD')continue;
  result[key]=value.trim();
 }
 if((result.price==null||String(result.price).trim()==='')&&imported.price!=null&&String(imported.price).trim()!==''&&Number.isFinite(Number(imported.price))&&Number(imported.price)>=0)result.price=Number(imported.price);
 if((!result.category||result.category==='Other')&&imported.category&&imported.category!=='Other')result.category=imported.category;
 return result;
}
