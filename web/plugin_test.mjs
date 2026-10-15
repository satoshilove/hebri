import { readFileSync } from 'fs';
import React from 'react';
import { renderToString } from 'react-dom/server';

const src = readFileSync('C:/Users/User/Desktop/synapsek-hermes/synapsek_hermes/plugin/dashboard/dist/index.js', 'utf8');

let lastFetch = null;
const SDK = {
  sdkVersion: 'test', React,
  hooks: { useState: React.useState, useEffect: (fn) => { queueMicrotask(fn); }, useCallback: (f)=>f, useMemo: (f)=>f(), useRef: React.useRef, useContext: React.useContext, createContext: React.createContext },
  components: {}, utils: { cn: (c) => c }, useI18n: () => ({ t: {}, locale: 'en' }),
  fetchJSON: async (url, opts) => { lastFetch = url; return { name: 'synapsek-cci', switch: { cci_enabled: true, cci_strict: false }, corpus_version: '1.3.0', tasks: { count: 61, tasks: [{ name: 't1', has_seed: false, has_gold_reference: true, proof_ref: null }] }, price_point: 'mid', usd_per_answer: 0.005, savings_curve: [{ escalate_share: 1, per_answer_always_usd: 0.005, per_answer_hybrid_usd: 0.005, pct_cheaper: 0 }], present: true, lines: ['x'], consultations_in_tail: 1, blocks_in_tail: 0, verified: true, gt_pass: true, probes: { a: true }, probes_passed: 1, probes_total: 1 }; },
};
globalThis.window = { __HERMES_PLUGIN_SDK__: SDK, __HERMES_PLUGINS__: { register: (n, c) => { globalThis.__reg = [n, c]; }, registerSlot: () => {} } };

try {
  (0, eval)(src);
} catch (e) {
  console.error('IIFE THREW:', e);
  process.exit(1);
}
if (!globalThis.__reg) { console.error('NOT REGISTERED (silently bailed)'); process.exit(1); }
const [name, Comp] = globalThis.__reg;
console.log('registered:', name, typeof Comp);
try {
  const html = renderToString(React.createElement(Comp));
  console.log('RENDER OK, length =', html.length, '| last fetch:', lastFetch);
  console.log(html.slice(0, 400));
} catch (e) {
  console.error('RENDER THREW:', e);
  process.exit(1);
}
