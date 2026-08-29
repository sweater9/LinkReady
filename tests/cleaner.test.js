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

console.log('cleaner tests passed');
