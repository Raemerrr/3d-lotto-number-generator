import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeAd, mayRequestAd, AD_SLOT } from '../src/ads.js';
const expected = new URL('https://raemerrr.github.io/3d-lotto-number-generator/');
test('ads run only on live HTTPS app pages, never preview, local or root homepage', () => {
  assert.equal(AD_SLOT, '7285522592');
  for (const address of ['http://127.0.0.1:4173/3d-lotto-number-generator/ko/', 'https://raemerrr.github.io/', 'https://example.com/3d-lotto-number-generator/ko/'])
    assert.equal(mayRequestAd('live', new URL(address), expected), false);
  for (const mode of ['off', 'preview']) assert.equal(mayRequestAd(mode, new URL(expected+'ko/'), expected), false);
  assert.equal(mayRequestAd('live', new URL(expected+'ko/?game=powerball'), expected), true);
});
test('one ad request per document; failure does not throw or retry', () => {
  const section = {dataset: {mode:'live',site:expected.href}};
  const scripts = [];
  const doc = {getElementById:()=>section,createElement:()=>({}),head:{append:s=>scripts.push(s)}};
  const win = {location:{href:expected+'ko/'}};
  initializeAd(doc,win); initializeAd(doc,win);
  assert.equal(scripts.length,1);
  assert.equal(win.adsbygoogle.length,1);
  scripts[0].onerror(); initializeAd(doc,win);
  assert.equal(section.dataset.loadState,'unavailable');
  assert.equal(scripts.length,1);
});
