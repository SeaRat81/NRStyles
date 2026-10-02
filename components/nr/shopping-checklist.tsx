'use client';
import {useState} from 'react';
import type {RecordData} from '@/lib/nr/types';
import {shoppingGroups} from '@/lib/nr/shopping';
import {Progress} from '@/components/ui/progress';
import {ExternalLink,Check,Shirt} from 'lucide-react';
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
export function ShoppingChecklist({session,items,busy,onPurchase,onBack}:{session:RecordData;items:RecordData[];busy:boolean;onPurchase:(id:string,purchased:boolean)=>Promise<unknown>;onBack:()=>void}){
 const groups=shoppingGroups(items);
 const [retailer,setRetailer]=useState(()=>groups.find(g=>g.items.some(i=>!i.purchased))?.key||groups[0]?.key||'');
 const current=groups.find(g=>g.key===retailer)||groups[0];
 const all=groups.flatMap(g=>g.items);const purchased=all.filter(i=>i.purchased).length;
 const index=current?groups.indexOf(current):-1;
 return <div className="shopping-checklist"><button className="ghost back" onClick={onBack}>Back to recommendations</button><p className="eyebrow">{session.title}</p><h1>Make My Purchases</h1><p className="lead">Shop one retailer at a time. Open each item, choose your recommended size and color, and add it to that retailer’s bag. Check out once at that retailer, then mark the items you ordered as purchased.</p>
 {!all.length?<div className="empty"><h2>No items selected for purchase</h2><p>Select Purchase Now on your recommendations to build your shopping checklist.</p><button onClick={onBack}>Review recommendations</button></div>:<>
 <div className="card shopping-progress"><div><strong>{purchased} of {all.length} items marked purchased</strong><span>{money(all.reduce((n,i)=>n+Number(i.price||0),0))} selected total</span></div><Progress value={Math.round(purchased/all.length*100)} aria-label="Shopping progress"/><p className="muted">Progress saves to your account. Prices exclude retailer taxes and shipping.</p></div>
 {purchased===all.length&&<div className="success" role="status">All selected items are marked purchased. Once they arrive, return to your session and choose Close Session to confirm what you kept.</div>}
 <div className="shopping-layout"><nav className="retailer-menu" aria-label="Shop by retailer">{groups.map((g,n)=><button key={g.key} className={g.key===current.key?'retailer-step selected':'retailer-step'} aria-current={g.key===current.key?'step':undefined} onClick={()=>setRetailer(g.key)}><span>{n+1}. {g.name}</span><small>{g.items.filter(i=>i.purchased).length} of {g.items.length} purchased</small></button>)}</nav>
 <div className="retailer-checklist"><div className="page-heading"><div><p className="eyebrow">Retailer {index+1} of {groups.length}</p><h2>{current.name}</h2><p className="muted">{current.items.length} items · {money(current.items.reduce((n,i)=>n+Number(i.price||0),0))}</p></div></div>
 <div className="shopping-items">{current.items.map(item=><article key={item.id} className={'shopping-item '+(item.purchased?'ordered':'')}>{item.image?<img src={item.image} alt={item.name}/>:<div className="shopping-photo"><Shirt/></div>}<div><h3>{item.name}</h3><p className="price">{money(Number(item.price||0))}</p><p className="details">Size: <strong>{item.size||'Confirm at retailer'}</strong><br/>Color: <strong>{item.color||'Confirm at retailer'}</strong></p>{item.notes&&<p className="stylist-note">{item.notes}</p>}<div className="shopping-actions"><a className="button" href={item.url} target="_blank" rel="noopener noreferrer">Open Item <ExternalLink size={15}/></a>{item.purchased?<><span className="purchased-label"><Check size={16}/>Purchased</span><button className="ghost" disabled={busy} onClick={()=>onPurchase(item.id,false).catch(()=>{})}>Undo purchased</button></>:<button className="ghost" disabled={busy} onClick={()=>onPurchase(item.id,true).catch(()=>{})}>Mark as Purchased</button>}</div></div></article>)}</div>
 <p className="muted">Mark an item purchased only after placing your order. Opening a link doesn’t confirm a purchase. Purchased items enter your wardrobe after you confirm they were kept.</p><div className="shopping-next">{index>0&&<button className="ghost" onClick={()=>setRetailer(groups[index-1].key)}>Previous Retailer</button>}{index<groups.length-1?<button onClick={()=>setRetailer(groups[index+1].key)}>Next Retailer: {groups[index+1].name}</button>:<button onClick={onBack}>Return to Session</button>}</div>
 </div></div></>}
 </div>;
}
