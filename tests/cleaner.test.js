const assert=require('node:assert/strict');
global.window=global;
require('../cleaner.js');

const standard={preset:'standard'};

const facebook=LinkReadyCleaner.inspect('https://example.com/story?fbclid=abc123&utm_source=facebook&id=42',standard);
assert.deepEqual(facebook.cleaned.removed,['fbclid','utm_source']);
assert.equal(facebook.parameters.find(p=>p.name==='fbclid').identifier.kind,'click-id');
assert.match(facebook.parameters.find(p=>p.name==='fbclid').explanation,/Facebook adds this unique click ID/);
assert.equal(facebook.parameters.find(p=>p.name==='id').kind,'functional');

const affiliate=LinkReadyCleaner.inspect('https://www.amazon.ae/dp/B012345678?tag=partner-21&ascsubtag=campaign-a',standard);
assert.equal(affiliate.identifierFindings.filter(f=>f.kind==='referral').length,2);
assert.match(affiliate.parameters.find(p=>p.name==='tag').explanation,/affiliate or associate tag/);

const personal=LinkReadyCleaner.inspect('https://example.com/welcome?user_id=customer-123&email=person%40example.com',standard);
assert.equal(personal.identifierFindings.filter(f=>f.kind==='personal').length,2);

const pathReferral=LinkReadyCleaner.inspect('https://example.com/invite/ABC12345?utm_medium=social',standard);
assert.equal(pathReferral.identifierFindings.some(f=>f.source==='path'&&f.kind==='referral'),true);

const ordinary=LinkReadyCleaner.inspect('https://example.com/article/long-but-normal-slug?page=2&filter=new',standard);
assert.equal(ordinary.identifierFindings.length,0);
assert.equal(ordinary.parameters.every(p=>p.kind==='functional'),true);
assert.equal(ordinary.transparency.length,0);

const lookalike=LinkReadyCleaner.inspect('https://arnazon.com/account?utm_source=email',standard);
assert.equal(lookalike.transparency.some(f=>f.kind==='lookalike'&&f.severity==='warning'),true);

const official=LinkReadyCleaner.inspect('https://www.amazon.ae/dp/B012345678',standard);
assert.equal(official.transparency.some(f=>f.kind==='lookalike'),false);

const wrapped=LinkReadyCleaner.inspect('https://redirect.example/go?target=https%3A%2F%2Fexample.com%2Fsafe',standard);
assert.equal(wrapped.transparency.some(f=>f.kind==='redirect'&&/redirect\.example/.test(f.message)&&/example\.com/.test(f.message)),true);

const encoded=LinkReadyCleaner.inspect(`https://example.com/open?payload=${'A'.repeat(140)}`,standard);
assert.equal(encoded.transparency.some(f=>f.kind==='encoded'),true);

const base64Target=Buffer.from('https://example.com/final').toString('base64url');
const base64Wrapped=LinkReadyCleaner.inspect(`https://redirect.example/go?target=${base64Target}`,standard);
assert.equal(base64Wrapped.transparency.some(f=>f.kind==='redirect'),true);

console.log('cleaner tests passed');
