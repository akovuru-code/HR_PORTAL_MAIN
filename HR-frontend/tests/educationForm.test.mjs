import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

test('rendered education form has four matching cards and no standalone Degree or education add/delete controls', async () => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('../src/pages/onboarding/Education.jsx', import.meta.url))],
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
    plugins: [{ name: 'education-context-fixture', setup(builder) {
      builder.onResolve({ filter: /useAuth$|useOnboardingPermissions$|AdminViewContext$/ }, args => ({ path: args.path, namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
        export const useAuth = () => ({ user: { employeeId: 42 } });
        export const useAdminView = () => ({});
        export const useOnboardingPermissions = () => ({ canEdit: true, onboardingSubmitted: false });
      ` }));
    } }],
  });
  const module = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, require: createRequire(import.meta.url), console });
  const html = renderToStaticMarkup(React.createElement(module.exports.default));
  const cards = [...html.matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/g)].map(match => match[1]);
  assert.equal(cards.length, 4);
  const headings = cards.map(card => card.match(/<h3[^>]*>(.*?)<\/h3>/)[1].replaceAll('&#x27;', "'"));
  assert.deepEqual(headings, ["Master's", "Bachelor's", 'Class 12th', 'High School']);
  for (const card of cards) {
    assert.equal((card.match(/<input\b/g) || []).length, 10);
    assert.ok(card.includes('Upload Certificate:'));
    assert.ok(!card.includes('text-red-500'));
    assert.ok(!/\srequired(?:=|\s|>)/.test(card));
    assert.ok(card.includes('md:grid-cols-3'));
    assert.ok(card.includes('sm:grid-cols-2'));
    assert.ok(!card.includes('<button'));
    assert.ok(!card.includes('+ Add'));
  }
  // The separate certification and evaluation controls remain available once loaded.
  assert.ok(html.includes('Certifications'));
  assert.ok(html.includes('Evaluation'));
});
