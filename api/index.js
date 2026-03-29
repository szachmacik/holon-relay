export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const p = url.pathname;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.status(204).end();

  const TARGETS = [
    {n:"sentinel",u:"https://inshallah-worker.maciej-koziej01.workers.dev/scan",m:"GET"},
    {n:"vagus",u:"https://capacity-poller.maciej-koziej01.workers.dev/scan",m:"GET"},
    {n:"mitosis",u:"https://cosmic-oracle.maciej-koziej01.workers.dev/mitosis",m:"POST",b:{count:5}},
    {n:"prime",u:"https://kairos-os.maciej-koziej01.workers.dev/session",m:"POST",b:{engine_id:"vercel_relay",tokens_in:200,tokens_out:100,ops:2,calls:1}},
    {n:"brick",u:"https://brick-producer.maciej-koziej01.workers.dev/cycle",m:"POST",b:{force:true}},
    {n:"sol",u:"https://sol-luna.maciej-koziej01.workers.dev/observe",m:"POST",b:{}},
    {n:"planet",u:"https://planetary-mesh.maciej-koziej01.workers.dev/pulse",m:"POST",b:{}},
  ];

  const UPS="https://fresh-walleye-84119.upstash.io";
  const UPT="gQAAAAAAAUiXAAIncDEwMjljNTI2ZGQ5OWQ0OGJlOTFmYWU2YjQ2OGI0NmIyZXAxODQxMTk";

  if (p==="/api"||p==="/api/"||p==="/") return res.json({service:"holon-relay",targets:TARGETS.map(t=>t.n),endpoints:["/api/beat","/api/health","/api/relay/:name"]});

  if (p==="/api/beat") {
    const t0=Date.now();
    const rs=await Promise.allSettled(TARGETS.map(async t=>{
      const s=Date.now();
      try{
        const o={method:t.m,headers:{"User-Agent":"VercelRelay/1","Content-Type":"application/json"}};
        if(t.m==="POST"&&t.b)o.body=JSON.stringify(t.b);
        const r=await fetch(t.u,o);
        return{n:t.n,ok:r.ok,ms:Date.now()-s};
      }catch(e){return{n:t.n,ok:false,ms:Date.now()-s};}
    }));
    const rp=rs.map((r,i)=>r.status==="fulfilled"?r.value:{n:TARGETS[i].n,ok:false,ms:0});
    const a=rp.filter(r=>r.ok).length;
    const h=Math.round(a/TARGETS.length*100);
    let bn=0;
    try{const r=await fetch(UPS+"/get/holon%3Apacemaker%3Abeat_count",{headers:{Authorization:"Bearer "+UPT}});const d=await r.json();bn=parseInt(d.result||"0")+1;}catch{bn=1;}
    const st={beat:bn,ts:new Date().toISOString(),alive:a,total:TARGETS.length,health:h,ms:Date.now()-t0,source:"vercel_relay",results:rp};
    await fetch(UPS+"/set/holon%3Apacemaker%3Alast_beat/"+encodeURIComponent(JSON.stringify(st))+"?ex=86400",{method:"POST",headers:{Authorization:"Bearer "+UPT}}).catch(()=>{});
    await fetch(UPS+"/set/holon%3Apacemaker%3Abeat_count/"+bn+"?ex=31536000",{method:"POST",headers:{Authorization:"Bearer "+UPT}}).catch(()=>{});
    return res.json(st);
  }

  if (p==="/api/health") {
    try{const r=await fetch(UPS+"/get/holon%3Apacemaker%3Alast_beat",{headers:{Authorization:"Bearer "+UPT}});const d=await r.json();return res.json({last:d.result?JSON.parse(d.result):null});}
    catch{return res.json({last:null});}
  }

  if (p.startsWith("/api/relay/")) {
    const name=p.replace("/api/relay/","");
    const t=TARGETS.find(x=>x.n===name);
    if(!t)return res.status(404).json({error:"not found",available:TARGETS.map(x=>x.n)});
    try{
      const o={method:t.m,headers:{"User-Agent":"VR/1","Content-Type":"application/json"}};
      if(t.m==="POST"&&t.b)o.body=JSON.stringify(t.b);
      const r=await fetch(t.u,o);const d=await r.json();
      return res.json({target:name,ok:r.ok,data:d});
    }catch(e){return res.status(500).json({target:name,error:String(e)});}
  }

  return res.status(404).json({error:"404"});
}
