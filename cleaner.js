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

  const PARAMETER_EXPLANATIONS={
    fbclid:'Facebook adds this unique click ID when a link is opened from Facebook. It can help connect the visit back to the Facebook click or ad interaction, especially when the destination uses Meta measurement tools.',
    gclid:'Google Ads adds this unique click ID so an advertiser can connect the visit and later actions with a particular ad click.',
    dclid:'Google Campaign Manager adds this click ID to measure which display ad led to the visit.',
    msclkid:'Microsoft Advertising adds this unique click ID so the destination can attribute activity to a Bing or Microsoft ad click.',
    ttclid:'TikTok adds this unique click ID to measure activity that follows a TikTok ad click.',
    twclid:'X adds this unique click ID to measure activity that follows an ad click on X.',
    yclid:'Yandex adds this unique click ID to attribute the visit to an advertisement.',
    igshid:'Instagram adds this sharing identifier to some links. It can reveal that the link came through Instagram and help associate the visit with that sharing flow.',
    igsh:'Instagram adds this sharing identifier to some copied links. The destination normally works without it.',
    si:'YouTube adds this sharing token to some copied links. It identifies the share instance rather than the video itself, so the video normally works without it.',
    feature:'YouTube uses this to record which product feature or sharing surface produced the link. It is not needed to identify the video.',
    pp:'YouTube uses this encoded value for playback or promotional context. Shared videos usually work without it.',
    mc_cid:'Mailchimp adds this campaign ID so visits can be attributed to a particular email campaign.',
    mc_eid:'Mailchimp adds this recipient-related identifier to email links. It may let the sender connect the visit with a subscriber record.',
    mkt_tok:'Marketing platforms add this token to connect a visit with a campaign or recipient record.',
    tag:'Amazon uses this as an affiliate or associate tag. Keeping it may credit the person or publisher who shared the link.',
    ascsubtag:'Amazon affiliates use this extra tag for more detailed referral attribution. It may identify the campaign or sharing partner.',
    linkcode:'Amazon uses this to describe how an affiliate link was created. It is normally unnecessary for opening the product page.',
    ref:'This commonly records the referring source, campaign, or person. On some sites it is functional, so LinkReady only removes it under applicable rules or an aggressive preset.',
    affiliate:'This commonly identifies an affiliate relationship so a purchase or signup can be credited to a partner.',
    affiliate_id:'This commonly identifies the affiliate or partner who should receive referral credit.',
    referral_code:'This referral code may credit the person or campaign that shared the link.',
    ref_code:'This referral code may credit the person or campaign that shared the link.',
    partner_id:'This commonly identifies a commercial or referral partner for attribution.',
    subid:'Affiliates use this secondary ID to identify a campaign, placement, or individual sharing source.',
    sub_id:'Affiliates use this secondary ID to identify a campaign, placement, or individual sharing source.'
  };

  const REFERRAL_KEYS=new Set(['aff','affiliate','affiliate_id','affiliateid','ascsubtag','invite','invite_code','partner','partner_id','promo','promo_code','ref','ref_code','referral','referral_code','subid','sub_id','tag']);
  const PERSONAL_KEYS=new Set(['account','account_id','customer','customer_id','email','member','member_id','phone','recipient','recipient_id','subscriber','subscriber_id','uid','user','user_id','userid']);
  const CLICK_ID_KEYS=new Set(['clickid','click_id','dclid','fbclid','gclid','msclkid','ttclid','twclid','yclid']);
  const REDIRECT_KEYS=new Set(['continue','dest','destination','href','link','next','out','redirect','redirect_uri','redirect_url','return','return_url','target','to','u','url']);
  const BRANDS=['adobe','amazon','apple','discord','dropbox','facebook','github','google','instagram','linkedin','microsoft','netflix','paypal','stripe','tiktok','whatsapp','youtube'];
  const COUNTRY_SUFFIXES=new Set(['co.uk','com.au','co.jp','co.in','co.nz','com.br','com.cn','com.hk','com.mx','com.my','com.ph','com.sg','com.tr','com.tw','co.za']);

  function genericExplanation(name,kind,host){
    const lower=name.toLowerCase();
    if(lower.startsWith('utm_')){
      const labels={utm_source:'where the visitor came from',utm_medium:'the marketing channel',utm_campaign:'the campaign name',utm_content:'which link or creative was used',utm_term:'the paid-search keyword'};
      return `Marketers use this field to record ${labels[lower]||'campaign attribution'}. It is useful for analytics but is not normally required to open the page on ${host}.`;
    }
    if(lower.startsWith('pd_rd_')||lower.startsWith('pf_rd_'))return 'Amazon uses this value for recommendation, placement, or advertising attribution. It is not normally needed to open the product page.';
    if(kind==='tracking')return `This matches a known tracking field. It helps measure how the visit reached ${host}, but is not normally required for the page itself.`;
    return `LinkReady kept this value because it may control content or behaviour on ${host}. Remove it only if you know the page works without it.`;
  }

  function identifierFor(name,value){
    const lower=name.toLowerCase();
    if(REFERRAL_KEYS.has(lower))return{kind:'referral',label:'referral / affiliate',message:'This looks like a referral or affiliate code. Sharing it may credit a person, publisher, or campaign.'};
    if(PERSONAL_KEYS.has(lower))return{kind:'personal',label:'possible personal ID',message:'This field name suggests it may identify a person, customer, subscriber, or account. Check it before sharing.'};
    if(CLICK_ID_KEYS.has(lower))return{kind:'click-id',label:'unique click ID',message:'This looks unique to one click. It may let services connect activity across systems, although it does not necessarily reveal your name by itself.'};
    const decoded=String(value||'');
    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decoded))return{kind:'personal',label:'possible personal ID',message:'The value looks like an email address and may directly identify someone. Check it before sharing.'};
    if(/(?:id|token|user|account|member|recipient|subscriber|click|track|ref|aff)/i.test(lower)&&decoded.length>=20&&/^[A-Za-z0-9._~-]+$/.test(decoded))return{kind:'personal',label:'possible personal token',message:'This long token may identify a person, account, session, or individual click. LinkReady cannot confirm its purpose locally.'};
    return null;
  }

  function pathFindings(url){
    const parts=url.pathname.split('/').filter(Boolean);
    const findings=[];
    for(let i=0;i<parts.length-1;i++){
      if(/^(?:aff|affiliate|invite|invitation|r|ref|referral|u|user)$/i.test(parts[i])&&parts[i+1].length>=4){
        findings.push({source:'path',name:`/${parts[i]}/…`,kind:/^(?:aff|affiliate|invite|invitation|r|ref|referral)$/i.test(parts[i])?'referral':'personal',label:/^(?:aff|affiliate|invite|invitation|r|ref|referral)$/i.test(parts[i])?'referral path':'possible personal path',message:/^(?:aff|affiliate|invite|invitation|r|ref|referral)$/i.test(parts[i])?'The address path appears to contain an invite or referral code. Sharing it may credit the person or campaign that created it.':'The address path appears to contain a user-related identifier. Check it before sharing.'});
        break;
      }
    }
    return findings;
  }

  function editDistance(a,b){
    const row=Array.from({length:b.length+1},(_,i)=>i);
    for(let i=1;i<=a.length;i++){
      let previous=row[0];row[0]=i;
      for(let j=1;j<=b.length;j++){
        const saved=row[j];
        row[j]=Math.min(row[j]+1,row[j-1]+1,previous+(a[i-1]===b[j-1]?0:1));
        previous=saved;
      }
    }
    return row[b.length];
  }

  function rootLabel(host){
    const parts=host.toLowerCase().replace(/\.$/,'').split('.');
    if(parts.length<2)return parts[0]||'';
    const suffix=parts.slice(-2).join('.');
    return parts[COUNTRY_SUFFIXES.has(suffix)?parts.length-3:parts.length-2]||parts[0];
  }

  function lookalikeBrand(host){
    if(host.includes('xn--'))return{brand:null,reason:'The domain uses internationalized characters encoded as Punycode, which can sometimes resemble another name.'};
    const root=rootLabel(host),folded=root.replace(/0/g,'o').replace(/[1|]/g,'l').replace(/rn/g,'m').replace(/vv/g,'w');
    for(const brand of BRANDS){
      if(root===brand)continue;
      if(folded===brand||editDistance(root,brand)===1||root.startsWith(brand+'-')||root.endsWith('-'+brand))return{brand,reason:`The registered-looking part “${root}” is visually close to “${brand}” but is not an exact match.`};
      const labels=host.split('.');
      if(labels.slice(0,-2).includes(brand))return{brand,reason:`“${brand}” appears only in a subdomain; the main domain is “${root}”.`};
    }
    return null;
  }

  function looksEncoded(value){
    const raw=String(value||'');
    if(raw.length<100)return false;
    const percent=(raw.match(/%[0-9a-f]{2}/ig)||[]).length;
    const compact=raw.replace(/\s/g,'');
    const base64ish=/^[A-Za-z0-9+/_=-]+$/.test(compact)&&compact.length>=120;
    return percent>=8||base64ish;
  }

  function transparencyCheck(url){
    const findings=[],host=url.hostname.toLowerCase(),lookalike=lookalikeBrand(host);
    if(lookalike)findings.push({kind:'lookalike',severity:'warning',title:'Possible look-alike domain',message:`${lookalike.reason} Check the spelling before opening or sharing it.`});
    let embedded=null;
    for(const [name,value] of url.searchParams){
      if(!REDIRECT_KEYS.has(name.toLowerCase()))continue;
      const decoded=decodeCandidate(value);
      if(!decoded)continue;
      const target=normalize(decoded);
      if(target&&target.hostname.toLowerCase()!==host){embedded={name,host:target.hostname.toLowerCase()};break}
    }
    if(embedded)findings.push({kind:'redirect',severity:'caution',title:'Different destination inside the URL',targetHost:embedded.host,message:`The visible link starts on ${host}, but its “${embedded.name}” field contains a destination on ${embedded.host}. This was decoded from the text only; LinkReady did not open either site.`});
    const encodedParams=[...url.searchParams].filter(([,value])=>looksEncoded(value)).map(([name])=>name);
    const encodedPath=url.pathname.split('/').filter(looksEncoded).length>0;
    if(encodedParams.length||encodedPath)findings.push({kind:'encoded',severity:'caution',title:'Long encoded content',message:`This URL contains an unusually long encoded ${encodedParams.length?`value in ${encodedParams.join(', ')}`:'path segment'}. It may hide a destination, token, or payload that cannot be fully understood from the visible text.`});
    if(url.toString().length>2000)findings.push({kind:'length',severity:'caution',title:'Extremely long URL',message:'This address is over 2,000 characters long. Very long links can conceal parameters or encoded content and deserve extra checking.'});
    return findings;
  }

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
      if(/^https?:\/\//i.test(String(candidate))){const direct=normalize(candidate);if(direct)return direct.toString()}
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
    const parameters=[...new Set(parsed.searchParams.keys())].map(name=>{
      const value=parsed.searchParams.get(name),kind=removed.has(name.toLowerCase())?'tracking':'functional';
      return{name,value,kind,explanation:PARAMETER_EXPLANATIONS[name.toLowerCase()]||genericExplanation(name,kind,parsed.hostname.toLowerCase()),identifier:identifierFor(name,value)};
    });
    const host=parsed.hostname.toLowerCase();
    const asciiLookalike=/xn--/.test(host);
    const mixedAlphabet=/[a-z].*[\u0400-\u04ff]|[\u0400-\u04ff].*[a-z]/i.test(host);
    const manyHyphens=(host.match(/-/g)||[]).length>=3;
    const warnings=[];
    if(asciiLookalike||mixedAlphabet)warnings.push('This domain may use look-alike characters. Check it carefully.');
    if(manyHyphens)warnings.push('This domain contains an unusual number of hyphens.');
    if(cleaned.isShortened)warnings.push('Short-link destination cannot be verified without contacting the shortener.');
    const identifierFindings=[...parameters.filter(p=>p.identifier).map(p=>({source:'parameter',name:p.name,...p.identifier})),...pathFindings(parsed)];
    const transparency=transparencyCheck(parsed),embeddedDestination=transparency.find(item=>item.kind==='redirect')?.targetHost;
    const destinationHost=embeddedDestination||normalize(cleaned.url)?.hostname.toLowerCase()||host;
    transparency.filter(item=>item.severity==='warning').forEach(item=>warnings.push(item.message));
    return{destination:cleaned.url,original:parsed.toString(),host,destinationHost,protocol:parsed.protocol,parameters,identifierFindings,transparency,fragment:parsed.hash||'',redirects:cleaned.redirectUnwrapped,warnings,cleaned};
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
