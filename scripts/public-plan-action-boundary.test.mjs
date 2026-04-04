import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const REPO_ROOT = process.cwd();

function read(relPath) {
  const fullPath = path.join(REPO_ROOT, relPath);
  assert.equal(existsSync(fullPath), true, `Expected file to exist: ${relPath}`);
  return readFileSync(fullPath, 'utf8');
}

test('public app shell depends on a dedicated public plan action boundary', () => {
  const shell = read('components/app/PublicAppShell.tsx');
  const surface = read('hooks/usePublicShellSurface.ts');
  const hook = read('hooks/usePublicPlanActions.ts');

  assert.match(shell, /import \{ usePublicShellSurface \} from '\.\.\/\.\.\/hooks\/usePublicShellSurface';/);
  assert.match(shell, /const \{[\s\S]*handlePlanSelect,[\s\S]*handleRequestPayment,[\s\S]*confirmDowngrade,[\s\S]*confirmMemberSelection,[\s\S]*\} = usePublicShellSurface\(\{/s);
  assert.doesNotMatch(shell, /const handlePlanSelect =/);
  assert.doesNotMatch(shell, /const handleRequestPayment =/);
  assert.doesNotMatch(shell, /const executePlanChange =/);
  assert.doesNotMatch(shell, /const confirmDowngrade =/);
  assert.doesNotMatch(shell, /const confirmMemberSelection =/);
  assert.doesNotMatch(shell, /planService\.changePlan/);
  assert.doesNotMatch(shell, /planService\.executeDowngrade/);
  assert.doesNotMatch(shell, /planService\.suspendMembersForDowngrade/);
  assert.doesNotMatch(shell, /tossPaymentService\.requestPayment/);
  assert.doesNotMatch(shell, /estimateDowngradeCreditDetail/);

  assert.match(surface, /import \{ usePublicPlanActions \} from '\.\/usePublicPlanActions';/);
  assert.match(surface, /const \{[\s\S]*handlePlanSelect,[\s\S]*handleRequestPayment,[\s\S]*confirmDowngrade,[\s\S]*confirmMemberSelection,[\s\S]*\} = usePublicPlanActions\(\{/s);
  assert.match(hook, /planService\.changePlan/);
  assert.match(hook, /planService\.executeDowngrade/);
  assert.match(hook, /planService\.suspendMembersForDowngrade/);
  assert.match(hook, /tossPaymentService\.requestPayment/);
  assert.match(hook, /estimateDowngradeCreditDetail/);
});

test('public app shell keeps downgrade and member-select modal wiring at the shell layer', () => {
  const shell = read('components/app/PublicAppShell.tsx');
  const chrome = read('components/app/PublicShellChrome.tsx');

  assert.match(shell, /<PublicShellChrome[\s\S]*downgradePending=\{downgradePending\}/s);
  assert.match(shell, /<PublicShellChrome[\s\S]*confirmDowngrade=\{confirmDowngrade\}/s);
  assert.match(shell, /<PublicShellChrome[\s\S]*confirmMemberSelection=\{confirmMemberSelection\}/s);
  assert.doesNotMatch(shell, /<ConfirmModal/);
  assert.doesNotMatch(shell, /<DowngradeMemberSelectModal/);

  assert.match(chrome, /<ConfirmModal/);
  assert.match(chrome, /<DowngradeMemberSelectModal/);
  assert.match(chrome, /downgradePending/);
  assert.match(chrome, /memberSelectPending/);
  assert.match(chrome, /onConfirm=\{confirmDowngrade\}/);
  assert.match(chrome, /onConfirm=\{confirmMemberSelection\}/);
  assert.match(chrome, /onCancel=\{\(\) => setDowngradePending\(null\)\}/);
  assert.match(chrome, /onCancel=\{\(\) => setMemberSelectPending\(null\)\}/);
  assert.match(chrome, /hospitalId=\{user\.hospitalId\}/);
  assert.match(chrome, /newPlan=\{memberSelectPending\.plan\}/);
});
