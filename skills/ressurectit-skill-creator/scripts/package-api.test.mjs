//@ts-check

/**
 * Self-test for package-api.mjs. Run: node --test scripts/package-api.test.mjs
 * Builds a tiny fake package + skill in a temp directory (created and removed by the test itself).
 */

import {test, after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {coverage, findEntryPoints, inventory, skillChecks} from './package-api.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'package-api-test-'));
after(() => fs.rmSync(root, {recursive: true, force: true}));

/**
 * @param {string} rel
 * @param {string} content
 */
function write(rel, content)
{
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, content);
}

//######################### fake package #########################

write('pkg/package.json', JSON.stringify(
{
    name: '@test/pkg',
    version: '0.0.0-placeholder',
    exports:
    {
        './package.json': {default: './package.json'},
        '.': {types: './src/index.d.ts'},
        './forms': {types: './forms/src/index.d.ts'},
        './numeral': {types: './numeral/src/index.d.ts'},
        './styles': {sass: './styles/index.scss'},
    },
}));
write('pkg/src/index.ts', `export * from './components';\nexport {ButtonComponent as Btn} from './button/button.component';\nexport {LocalThing};\nclass LocalThing {}\n`);
write('pkg/src/components/index.ts', `export {MultiButtonComponent} from './multiButton.component';\n`);
write('pkg/src/components/multiButton.component.ts', `import {Component} from '@angular/core';\n\n@Component({selector: 'multi-button, other-button'})\nexport class MultiButtonComponent {}\n\nexport class Undecorated {}\n`);
write('pkg/src/button/button.component.ts', `@Component({selector: 'test-button'})\nexport class ButtonComponent {}\n`);
write('pkg/forms/package.json', '{}');
write('pkg/forms/src/index.ts', `export * from './validators';\n`);
write('pkg/forms/src/validators.ts', `@Directive({selector: 'input[number][minValue]'})\nexport class MinValidator {}\n@Directive({selector: 'input[number][maxValue]'})\nexport class MaxValidator {}\n@Directive({selector: '[formControl][strict]'})\nexport class StrictDirective {}\n@Pipe({name: 'fancy'})\nexport class FancyPipe {}\n`);
write('pkg/numeral/package.json', '{}');
write('pkg/numeral/src/index.js', 'export {};\n');

//######################### tests #########################

test('entry points come from exports, JS-only entry point goes to manual review, styles listed', () =>
{
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'pkg/package.json'), 'utf8'));
    const {entries, manual, styles} = findEntryPoints(path.join(root, 'pkg'), pkg);

    assert.deepEqual(entries.map(e => e.importPath), ['@test/pkg', '@test/pkg/forms']);
    assert.equal(manual[0].importPath, '@test/pkg/numeral');
    assert.deepEqual(styles, ['@test/pkg/styles']);
});

test('named re-exports resolve to real declaration (kind + file), aliases and local exports handled', () =>
{
    const symbols = inventory(path.join(root, 'pkg'))[0].symbols;
    const byName = Object.fromEntries(symbols.map(s => [s.name, s]));

    assert.equal(byName.MultiButtonComponent.kind, 'class');
    assert.match(byName.MultiButtonComponent.file, /multiButton\.component\.ts$/);
    assert.equal(byName.Btn.kind, 'class');
    assert.match(byName.Btn.file, /button\.component\.ts$/);
    assert.equal(byName.LocalThing.kind, 'class');
    assert.ok(!byName.Undecorated, 'not exported through the named re-export');
});

test('coverage: unique selector names count, generic/shared attributes do not, comma parts trimmed', () =>
{
    write('skill/SKILL.md', 'use other-button here. formControl ngModel number fancy\n');
    const result = coverage(path.join(root, 'pkg'), path.join(root, 'skill'));
    const forms = result.find(e => e.importPath === '@test/pkg/forms');
    const core = result.find(e => e.importPath === '@test/pkg');

    assert.ok(core?.viaSelector.some(v => v.name === 'MultiButtonComponent' && v.via === 'other-button'));
    //`number` is shared by Min/Max, `formControl` is generic -> still missing
    assert.deepEqual(forms?.missing.map(m => m.name).sort(), ['MaxValidator', 'MinValidator', 'StrictDirective']);
    assert.ok(forms?.viaSelector.some(v => v.name === 'FancyPipe'));
});

test('skill checks: CRLF frontmatter is parsed', () =>
{
    write('crlf/SKILL.md', '---\r\nname: x\r\ndescription: >-\r\n  something\r\nmetadata:\r\n  version: "1.0.0"\r\n---\r\n# x\r\n\r\n> Created for **@test/pkg v1.0.0**\r\n\r\n## Contents\r\n\r\n- a\r\n');
    assert.deepEqual(skillChecks(path.join(root, 'crlf')), []);
});

test('skill checks: description limit, missing contents, broken pointer, unreferenced nested file, foreign paths ignored', () =>
{
    write('bad/SKILL.md', `---\nname: x\ndescription: ${'a'.repeat(1100)}\nmetadata:\n  version: "1"\n---\n# x\n> Created for **p v1**\n## Usage\nsee references/missing.md and node_modules/foo/scripts/build.js\n`);
    write('bad/references/nested/deep.md', '# deep\n## Contents\n');
    const problems = skillChecks(path.join(root, 'bad')).join('\n');

    assert.match(problems, /description has 1100 chars/);
    assert.match(problems, /SKILL\.md: first "##" section should be "## Contents"/);
    assert.match(problems, /broken pointer: references\/missing\.md/);
    assert.doesNotMatch(problems, /scripts\/build\.js/);
    assert.match(problems, /references\/nested\/deep\.md is not referenced/);
});
