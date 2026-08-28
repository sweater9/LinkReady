(function(global){
  const CONFIG={
    generic:{
      exact:['fbclid','gclid','dclid','msclkid','mc_cid','mc_eid','igshid','vero_id','oly_anon_id','oly_enc_id','wickedid','yclid','twclid','ttclid','_hsenc','_hsmi','mkt_tok'],
      prefixes:['utm_','ga_','pk_']
    },
    platforms:[
      {name:'Amazon',patterns:['amazon.','amzn.'],exact:['ref','tag','linkcode','camp','creative','creativeasin','ascsubtag'],prefixes:['pd_rd_','pf_rd_']},
      {name:'YouTube',patterns:['youtube.com','youtu.be'],exact:['si','feature','pp'],prefixes:[]},
      {name:'X / Twitter',patterns:['x.com','twitter.com'],exact:['s','t'],prefixes:[]},
      {name:'Instagram',patterns:['instagram.com'],exact:['igsh','igshid'],prefixes:[]},
      {name:'TikTok',patterns:['tiktok.com'],exact:['_r','_t','share_app_id','share_link_id','sender_device'],prefixes:[]}
    ]
  };

  function normalize(raw){
    let value=String(raw||'').trim();
    if(!value)return null;
    if(!/^https?:\/\//i.test(value))value='https://'+value;
    try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url:null}catch{return null}
  }

  function cleanCore(raw,config,options){
    const opts=options||{};
    const parsed=normalize(raw);
    if(!parsed)return null;
    const clone=new URL(parsed.toString());
    const host=clone.hostname.toLowerCase();
    const matched=config.platforms.find(rule=>rule.patterns.some(pattern=>host.includes(pattern)))||null;
    const exact=new Set(config.generic.exact.map(v=>v.toLowerCase()));
    const prefixes=config.generic.prefixes.map(v=>v.toLowerCase());
    if(matched){matched.exact.forEach(v=>exact.add(v.toLowerCase()));matched.prefixes.forEach(v=>prefixes.push(v.toLowerCase()))}
    const removed=[];
    [...clone.searchParams.keys()].forEach(key=>{
      const lower=key.toLowerCase();
      if(exact.has(lower)||prefixes.some(prefix=>lower.startsWith(prefix))){clone.searchParams.delete(key);if(!removed.includes(key))removed.push(key)}
    });
    if(clone.hash&&/^#(?:utm_|ref(?:errer)?=|fbclid=|gclid=)/i.test(clone.hash)){removed.push('fragment tracking');clone.hash=''}

    let amazonCanonical=null;
    if(host.includes('amazon.')){
      const match=clone.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i);
      if(match){
        const candidate=new URL(clone.origin+'/dp/'+match[1].toUpperCase());
        if(candidate.toString()!==clone.toString())amazonCanonical=candidate.toString();
        if(opts.canonicalizeAmazon)clone.href=candidate.toString();
      }
    }
    return{url:clone.toString(),removed,platform:matched?matched.name:'Generic',amazonCanonical};
  }

  function clean(raw,options){return cleanCore(raw,CONFIG,options)}

  function bookmarklet(){
    const core=cleanCore.toString();
    const config=JSON.stringify(CONFIG);
    const code=`(async()=>{const cleanCore=${core};const CONFIG=${config};const r=cleanCore(location.href,CONFIG,{canonicalizeAmazon:false});if(!r)return;try{await navigator.clipboard.writeText(r.url)}catch(e){const t=document.createElement('textarea');t.value=r.url;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}const n=document.createElement('div');n.textContent='Copied clean link!';Object.assign(n.style,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',zIndex:'2147483647',background:'#111827',color:'#fff',padding:'11px 16px',borderRadius:'999px',font:'700 13px system-ui,sans-serif',boxShadow:'0 12px 36px rgba(0,0,0,.22)'});document.body.appendChild(n);setTimeout(()=>n.remove(),1600)})()`;
    return'javascript:'+encodeURIComponent(code);
  }

  global.LinkReadyCleaner={CONFIG,normalize,clean,bookmarklet};
})(window);
