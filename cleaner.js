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
    ],
    redirectors:[
      {patterns:['l.facebook.com','lm.facebook.com','l.messenger.com'],params:['u','url','href']},
      {patterns:['google.com'],paths:['/url'],params:['q','url']},
      {patterns:['linkedin.com'],paths:['/redir/redirect','/safety/go'],params:['url','dest']}
    ],
    shorteners:['bit.ly','t.co','tinyurl.com','goo.gl','ow.ly','buff.ly','is.gd','cutt.ly','rb.gy','shorturl.at']
  };

  function normalize(raw){
    let value=String(raw||'').trim();
    if(!value)return null;
    if(!/^https?:\/\//i.test(value))value='https://'+value;
    try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url:null}catch{return null}
  }

  function decodeCandidate(value){
    if(!value)return null;
    const attempts=[value];
    try{attempts.push(decodeURIComponent(value))}catch{}
    for(const candidate of attempts){
      const direct=normalize(candidate);
      if(direct&&/^https?:$/i.test(direct.protocol))return direct.toString();
      const compact=String(candidate).replace(/\s/g,'').replace(/-/g,'+').replace(/_/g,'/');
      if(compact.length>=12&&/^[A-Za-z0-9+/]+=*$/.test(compact)){
        try{
          const padded=compact+'='.repeat((4-compact.length%4)%4);
          const decoded=atob(padded);
          const from64=normalize(decoded);
          if(from64&&/^https?:$/i.test(from64.protocol))return from64.toString();
        }catch{}
      }
    }
    return null;
  }

  function unwrapRedirect(raw,config){
    let current=normalize(raw);
    if(!current)return{url:null,unwrapped:[]};
    const unwrapped=[];
    for(let depth=0;depth<3;depth++){
      const host=current.hostname.toLowerCase();
      const rule=config.redirectors.find(r=>r.patterns.some(p=>host===p||host.endsWith('.'+p)||host.includes(p))&&(!r.paths||r.paths.some(path=>current.pathname.startsWith(path))));
      if(!rule)break;
      let next=null;
      for(const param of rule.params){
        const value=current.searchParams.get(param);
        const candidate=decodeCandidate(value);
        if(candidate){next=candidate;break}
      }
      if(!next||next===current.toString())break;
      unwrapped.push(host);
      current=normalize(next);
      if(!current)break;
    }
    return{url:current?current.toString():null,unwrapped};
  }

  function cleanCore(raw,config,options){
    const opts=options||{};
    const redirect=unwrapRedirect(raw,config);
    const parsed=normalize(redirect.url||raw);
    if(!parsed)return null;
    const clone=new URL(parsed.toString());
    const host=clone.hostname.toLowerCase();
    const matched=config.platforms.find(rule=>rule.patterns.some(pattern=>host.includes(pattern)))||null;
    const exact=new Set(config.generic.exact.map(v=>v.toLowerCase()));
    const prefixes=config.generic.prefixes.map(v=>v.toLowerCase());
    ;(opts.customRemove||[]).forEach(v=>exact.add(String(v).trim().toLowerCase()));
    const preserve=new Set((opts.preserve||[]).map(v=>String(v).trim().toLowerCase()));
    // Conservative removes only high-confidence generic trackers. Standard and
    // Aggressive also apply platform-specific sharing/affiliate cleanup.
    if(matched&&opts.preset!=='conservative'){matched.exact.forEach(v=>exact.add(v.toLowerCase()));matched.prefixes.forEach(v=>prefixes.push(v.toLowerCase()))}
    const removed=[];
    [...clone.searchParams.keys()].forEach(key=>{
      const lower=key.toLowerCase();
      const aggressive=opts.preset==='aggressive'&&/^(?:ref|source|campaign|campaignid|aff|affiliate|tracking|trk)$/i.test(lower);
      if(!preserve.has(lower)&&(exact.has(lower)||prefixes.some(prefix=>lower.startsWith(prefix))||aggressive)){clone.searchParams.delete(key);if(!removed.includes(key))removed.push(key)}
    });
    if(clone.hash&&/^#(?:utm_|ref(?:errer)?=|fbclid=|gclid=)/i.test(clone.hash)){removed.push('fragment tracking');clone.hash=''}
    let amazonCanonical=null;
    if(host.includes('amazon.')){
      const match=clone.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i);
      if(match){const candidate=new URL(clone.origin+'/dp/'+match[1].toUpperCase());if(candidate.toString()!==clone.toString())amazonCanonical=candidate.toString();if(opts.canonicalizeAmazon)clone.href=candidate.toString()}
    }
    const isShortened=config.shorteners.some(domain=>host===domain||host.endsWith('.'+domain));
    return{url:clone.toString(),removed,platform:matched?matched.name:'Generic',amazonCanonical,redirectUnwrapped:redirect.unwrapped,isShortened};
  }

  function clean(raw,options){return cleanCore(raw,CONFIG,options)}

  function inspect(raw,options){
    const parsed=normalize(raw);if(!parsed)return null;
    const cleaned=clean(raw,options);if(!cleaned)return null;
    const removed=new Set(cleaned.removed.map(v=>v.toLowerCase()));
    const parameters=[...parsed.searchParams.keys()].map(name=>({name,value:parsed.searchParams.get(name),kind:removed.has(name.toLowerCase())?'tracking':'functional'}));
    const host=parsed.hostname.toLowerCase();
    const asciiLookalike=/xn--/.test(host);
    const mixedAlphabet=/[a-z].*[\u0400-\u04ff]|[\u0400-\u04ff].*[a-z]/i.test(host);
    const manyHyphens=(host.match(/-/g)||[]).length>=3;
    const warnings=[];
    if(asciiLookalike||mixedAlphabet)warnings.push('This domain may use look-alike characters. Check it carefully.');
    if(manyHyphens)warnings.push('This domain contains an unusual number of hyphens.');
    if(cleaned.isShortened)warnings.push('Short-link destination cannot be verified without contacting the shortener.');
    return{destination:cleaned.url,original:parsed.toString(),host,protocol:parsed.protocol,parameters,fragment:parsed.hash||'',redirects:cleaned.redirectUnwrapped,warnings,cleaned};
  }

  function bookmarklet(){
    const normalizer=normalize.toString();
    const decoder=decodeCandidate.toString();
    const unwrapper=unwrapRedirect.toString();
    const core=cleanCore.toString();
    const config=JSON.stringify(CONFIG);
    const code=`(async()=>{const normalize=${normalizer};const decodeCandidate=${decoder};const unwrapRedirect=${unwrapper};const cleanCore=${core};const CONFIG=${config};const r=cleanCore(location.href,CONFIG,{canonicalizeAmazon:false});if(!r)return;try{await navigator.clipboard.writeText(r.url)}catch(e){const t=document.createElement('textarea');t.value=r.url;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}const n=document.createElement('div');n.textContent='Copied clean link!';Object.assign(n.style,{position:'fixed',left:'50%',bottom:'24px',transform:'translateX(-50%)',zIndex:'2147483647',background:'#111827',color:'#fff',padding:'11px 16px',borderRadius:'999px',font:'700 13px system-ui,sans-serif',boxShadow:'0 12px 36px rgba(0,0,0,.22)'});document.body.appendChild(n);setTimeout(()=>n.remove(),1600)})()`;
    return'javascript:'+encodeURIComponent(code);
  }

  global.LinkReadyCleaner={CONFIG,normalize,clean,inspect,bookmarklet};
})(window);
