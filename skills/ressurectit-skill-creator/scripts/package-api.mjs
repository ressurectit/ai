#!/usr/bin/env node
//@ts-check

/**
 * Public API inventory and skill coverage check for RessurectIT packages.
 *
 * Usage:
 *   node package-api.mjs info <package-repo>
 *       Package name, resolved version (with its source), dependencies, entry points
 *       (incl. entry points without .ts sources that need manual review), styles exports.
 *   node package-api.mjs inventory <package-repo> [--json]
 *       Every public export of every entry point, grouped by entry point and kind.
 *   node package-api.mjs coverage <package-repo> <skill-dir> [--json]
 *       Which public exports are mentioned in the skill's files (by name, or by a selector /
 *       pipe name unique to that class), plus structural skill checks.
 *
 * Environment:
 *   SKIP_NPM=1   don't query `npm view` (offline use, faster)
 *
 * Only node built-ins are used, no build of the package is needed (source .ts is parsed with regexes).
 */

import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const IGNORED_DIRS = new Set(['node_modules', 'demo', 'src', 'styles', 'docs', 'temp', 'es2015', 'es2020', 'es2022', 'es5', 'es', 'module', 'typings', '.git']);

/**
 * Attribute / element names that are shared by many directives (Angular forms, router, html) - never treated as unique alias.
 */
const GENERIC_SELECTOR_NAMES = new Set(
[
    'div', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'input', 'button', 'select', 'textarea', 'form', 'a', 'img', 'ul', 'li', 'label',
    'ng-container', 'ng-template', 'ng-content',
    'formControl', 'formControlName', 'formGroup', 'formGroupName', 'formArray', 'formArrayName', 'ngModel', 'ngForm', 'formField',
    'routerLink', 'type', 'name', 'value', 'data', 'disabled', 'readonly', 'required', 'id', 'class', 'style', 'title',
]);

//######################### helpers #########################

/**
 * Reads text file with normalized line endings.
 * @param {string} file
 */
export function readText(file)
{
    return fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
}

/**
 * @param {string} file
 */
function readJson(file)
{
    return JSON.parse(readText(file));
}

/**
 * @param {string} cmd
 * @param {string} cwd
 */
function tryExec(cmd, cwd)
{
    try
    {
        return execSync(cmd, {cwd, stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000}).toString().trim();
    }
    catch
    {
        return null;
    }
}

/**
 * @param {string|null} text
 */
function lines(text)
{
    return text ? text.split('\n').filter(Boolean) : [];
}

/**
 * Resolves version of package. RessurectIT repos keep `0.0.0-placeholder` in package.json and version comes from git tags.
 * @param {string} repo
 * @param {any} pkg
 */
export function resolveVersion(repo, pkg)
{
    const nearestTag = tryExec('git describe --tags --abbrev=0', repo);
    const latestTag = lines(tryExec('git tag --list "v*" --sort=-v:refname', repo))[0] ?? null;

    const result =
    {
        version: /** @type {string|null} */(null),
        source: '',
        gitDescribe: tryExec('git describe --tags --dirty', repo),
        nearestTag,
        latestTag,
        changelogTop: /** @type {string|null} */(null),
        npmLatest: /** @type {string|null} */(null),
        changedSinceTag: /** @type {string[]} */([]),
        uncommitted: lines(tryExec('git status --short', repo)),
        notes: /** @type {string[]} */([]),
    };

    const changelogFile = ['changelog.md', 'CHANGELOG.md'].map(f => path.join(repo, f)).find(f => fs.existsSync(f));

    if(changelogFile)
    {
        result.changelogTop = readText(changelogFile).match(/^##\s+Version\s+([^\s(]+)/mi)?.[1] ?? null;
    }

    const tag = latestTag ?? nearestTag;

    if(pkg.version && !/placeholder/.test(pkg.version))
    {
        result.version = pkg.version;
        result.source = 'package.json';
    }
    else if(tag)
    {
        result.version = tag.replace(/^v/, '');
        result.source = `git tag ${tag}${latestTag && latestTag !== nearestTag ? ' (latest v* tag)' : ''}`;
    }
    else if(result.changelogTop)
    {
        result.version = result.changelogTop;
        result.source = 'changelog.md';
    }

    if(process.env.SKIP_NPM !== '1')
    {
        result.npmLatest = tryExec(`npm view ${pkg.name} version`, repo);
    }

    if(latestTag && nearestTag && latestTag !== nearestTag)
    {
        result.notes.push(`Nearest tag from HEAD is ${nearestTag} but the latest v* tag is ${latestTag} - HEAD may be on an older line; the working tree may not match ${latestTag}.`);
    }

    if(tag)
    {
        result.changedSinceTag = lines(tryExec(`git diff --name-only ${tag}..HEAD`, repo));

        if(result.changedSinceTag.length)
        {
            result.notes.push(`HEAD differs from ${tag} in ${result.changedSinceTag.length} file(s) - see changedSinceTag; docs-only changes are usually safe to use.`);
        }
    }

    if(result.uncommitted.length)
    {
        result.notes.push(`Working tree has ${result.uncommitted.length} uncommitted change(s) - see uncommitted.`);
    }

    if(result.changelogTop && result.version && result.changelogTop !== result.version)
    {
        result.notes.push(`Top changelog entry is ${result.changelogTop}, resolved version is ${result.version}.`);
    }

    if(result.npmLatest && result.version && result.npmLatest !== result.version)
    {
        result.notes.push(`npm 'latest' is ${result.npmLatest}, resolved version is ${result.version}.`);
    }

    return result;
}

/**
 * Finds .ts index file of entry point directory (relative to repo).
 * @param {string} repo
 * @param {string} sub
 */
function findTsIndex(repo, sub)
{
    return ['src/index.ts', 'index.ts', 'src/public-api.ts', 'public-api.ts']
        .map(f => path.join(repo, sub, f))
        .find(f => fs.existsSync(f)) ?? null;
}

/**
 * Finds entry points from package.json#exports and from sub directories with own package.json.
 * Entry points without .ts sources and styles/wildcard exports are returned separately for manual review.
 * @param {string} repo
 * @param {any} pkg
 */
export function findEntryPoints(repo, pkg)
{
    /** @type {Map<string, {importPath: string, index: string}>} */
    const entries = new Map();
    /** @type {{importPath: string, reason: string}[]} */
    const manual = [];
    /** @type {string[]} */
    const styles = [];

    const add = (/** @type {string} */ sub) =>
    {
        const importPath = sub ? `${pkg.name}/${sub}` : pkg.name;

        if(entries.has(importPath) || manual.some(m => m.importPath === importPath))
        {
            return;
        }

        const index = findTsIndex(repo, sub);

        if(index)
        {
            entries.set(importPath, {importPath, index});
        }
        else
        {
            const jsIndex = ['src/index.js', 'index.js', 'src/index.d.ts'].map(f => path.join(sub, f)).find(f => fs.existsSync(path.join(repo, f)));
            manual.push({importPath, reason: jsIndex ? `no .ts source index (found ${jsIndex}) - review manually` : 'no source index found - review manually'});
        }
    };

    if(pkg.exports && typeof pkg.exports === 'object' && !Array.isArray(pkg.exports))
    {
        for(const key of Object.keys(pkg.exports))
        {
            if(key === './package.json')
            {
                continue;
            }

            if(key.includes('*') || /^\.\/(styles|typings)(\/|$)/.test(key))
            {
                if(!key.startsWith('./typings'))
                {
                    styles.push(`${pkg.name}${key.slice(1)}`);
                }

                continue;
            }

            add(key === '.' ? '' : key.replace(/^\.\//, ''));
        }
    }
    else
    {
        add('');
    }

    for(const dir of fs.readdirSync(repo, {withFileTypes: true}))
    {
        if(!dir.isDirectory() || IGNORED_DIRS.has(dir.name) || dir.name.startsWith('.'))
        {
            continue;
        }

        if(fs.existsSync(path.join(repo, dir.name, 'package.json')))
        {
            add(dir.name);
        }
    }

    if(!pkg.exports && fs.existsSync(path.join(repo, 'styles')))
    {
        styles.push(`${pkg.name}/styles`);
    }

    return {entries: [...entries.values()], manual, styles};
}

/**
 * @param {string} fromFile
 * @param {string} spec
 */
function resolveModule(fromFile, spec)
{
    const base = path.resolve(path.dirname(fromFile), spec);
    const candidates = [`${base}.ts`, path.join(base, 'index.ts'), base.replace(/\.js$/, '.ts')];

    return candidates.find(c => fs.existsSync(c) && fs.statSync(c).isFile()) ?? null;
}

/** @type {Map<string, Map<string, {kind: string, file: string}>>} */
const exportsCache = new Map();
const DECLARATION = /export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(class|interface|type|enum|function\*?|const\s+enum|const|let|var)\s+([A-Za-z_$][\w$]*)/g;

/**
 * @param {string} kind
 */
function normalizeKind(kind)
{
    return kind.replace(/\s+/g, ' ').replace('*', '');
}

/**
 * Returns exported symbols of file (following relative re-exports) with kind and file of their real declaration.
 * @param {string} file
 * @param {Set<string>} [stack] files currently being processed (cycle guard)
 * @returns {Map<string, {kind: string, file: string}>}
 */
export function exportsOf(file, stack = new Set())
{
    const cached = exportsCache.get(file);

    if(cached)
    {
        return cached;
    }

    /** @type {Map<string, {kind: string, file: string}>} */
    const out = new Map();

    if(stack.has(file))
    {
        return out;
    }

    stack.add(file);

    const source = readText(file)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');

    //export * from './x'; export * as ns from './x'
    for(const match of source.matchAll(/export\s+\*\s*(?:as\s+(\w+)\s*)?from\s*['"]([^'"]+)['"]/g))
    {
        if(match[1])
        {
            out.set(match[1], {kind: 'namespace', file});
            continue;
        }

        const resolved = match[2].startsWith('.') ? resolveModule(file, match[2]) : null;

        if(resolved)
        {
            for(const [name, info] of exportsOf(resolved, stack))
            {
                out.set(name, info);
            }
        }
    }

    //export {a, b as c} from './x'; export {a, b}; export type {X}
    for(const match of source.matchAll(/export\s+(type\s+)?\{([^}]*)\}\s*(?:from\s*['"]([^'"]+)['"])?/g))
    {
        const resolved = match[3]?.startsWith('.') ? resolveModule(file, match[3]) : null;
        const target = resolved ? exportsOf(resolved, stack) : null;

        for(const part of match[2].split(','))
        {
            const cleaned = part.trim().replace(/^type\s+/, '');

            if(!cleaned)
            {
                continue;
            }

            const [localName, exportedName = localName] = cleaned.split(/\s+as\s+/).map(s => s.trim());

            if(exportedName === 'default')
            {
                continue;
            }

            let info = target?.get(localName) ?? null;

            //local `export {a}` - find declaration in the same file
            if(!info && !match[3])
            {
                const local = source.match(new RegExp(`(?:^|\\s)(?:declare\\s+)?(?:abstract\\s+)?(class|interface|type|enum|function|const|let|var)\\s+${localName.replace(/\$/g, '\\$')}\\b`));
                info = local ? {kind: normalizeKind(local[1]), file} : null;
            }

            out.set(exportedName, info ?? {kind: match[1] ? 'type' : 're-export', file: resolved ?? file});
        }
    }

    for(const match of source.matchAll(DECLARATION))
    {
        out.set(match[2], {kind: normalizeKind(match[1]), file});
    }

    stack.delete(file);
    exportsCache.set(file, out);

    return out;
}

/**
 * Extracts template-facing names (selector names, pipe name) of class declared in file.
 * @param {string} file absolute path
 * @param {string} className
 * @returns {string[]}
 */
export function templateNames(file, className)
{
    const source = readText(file);
    const classIndex = source.search(new RegExp(`class\\s+${className.replace(/\$/g, '\\$')}\\b`));

    if(classIndex < 0)
    {
        return [];
    }

    const before = source.slice(0, classIndex);
    const decoratorStart = Math.max(before.lastIndexOf('@Component('), before.lastIndexOf('@Directive('), before.lastIndexOf('@Pipe('));

    //decorator must belong to this class - no other class declaration in between
    if(decoratorStart < 0 || /\bclass\s+[A-Za-z_$]/.test(before.slice(decoratorStart)))
    {
        return [];
    }

    const decorator = before.slice(decoratorStart);
    /** @type {string[]} */
    const names = [];
    const selector = decorator.match(/selector\s*:\s*['"`]([^'"`]+)['"`]/)?.[1];

    if(selector)
    {
        for(const part of selector.split(','))
        {
            for(const m of part.trim().matchAll(/\[([\w-]+)[^\]]*\]|^([\w-]+)|:not\([^)]*\)/g))
            {
                const name = m[1] ?? m[2];

                if(name)
                {
                    names.push(name);
                }
            }
        }
    }

    if(decoratorStart === before.lastIndexOf('@Pipe('))
    {
        const pipeName = decorator.match(/name\s*:\s*['"`]([^'"`]+)['"`]/)?.[1];

        if(pipeName)
        {
            names.push(pipeName);
        }
    }

    return [...new Set(names)];
}

/**
 * @param {string} repo
 */
export function inventory(repo)
{
    const pkg = readJson(path.join(repo, 'package.json'));
    const {entries} = findEntryPoints(repo, pkg);

    return entries.map(entry => (
    {
        importPath: entry.importPath,
        index: path.relative(repo, entry.index),
        symbols: [...exportsOf(entry.index).entries()]
            .map(([symbol, info]) => ({name: symbol, kind: info.kind, file: path.relative(repo, info.file)}))
            .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)),
    }));
}

/**
 * Lists bundled text files of skill (recursively), skipping evals and workspaces.
 * @param {string} dir
 * @returns {string[]}
 */
function skillFiles(dir)
{
    return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry =>
    {
        const full = path.join(dir, entry.name);

        if(entry.isDirectory())
        {
            return entry.name === 'node_modules' || entry.name === 'evals' || entry.name.endsWith('-workspace') ? [] : skillFiles(full);
        }

        return /\.(md|ts|html|scss|css|json|txt|mjs|js|sh)$/.test(entry.name) ? [full] : [];
    });
}

/**
 * @param {string} name
 */
function wordRegExp(name)
{
    return new RegExp(`(^|[^\\w$-])${name.replace(/[$.*+?^()[\]{}|\\]/g, '\\$&')}([^\\w$-]|$)`);
}

/**
 * Coverage of public exports by skill text.
 * @param {string} repo
 * @param {string} skillDir
 */
export function coverage(repo, skillDir)
{
    const text = skillFiles(skillDir).filter(f => !/\.(mjs|js|sh)$/.test(f)).map(readText).join('\n');
    const entries = inventory(repo);

    //template names used by exactly one class in whole package are usable aliases
    /** @type {Map<string, Set<string>>} */
    const owners = new Map();
    /** @type {Map<string, string[]>} */
    const namesOf = new Map();

    for(const symbol of entries.flatMap(e => e.symbols))
    {
        if(symbol.kind !== 'class' || namesOf.has(symbol.name))
        {
            continue;
        }

        const names = templateNames(path.join(repo, symbol.file), symbol.name);
        namesOf.set(symbol.name, names);

        for(const name of names)
        {
            (owners.get(name) ?? owners.set(name, new Set()).get(name))?.add(symbol.name);
        }
    }

    return entries.map(entry =>
    {
        /** @type {{name: string, kind: string, file: string}[]} */
        const missing = [];
        /** @type {{name: string, via: string}[]} */
        const viaSelector = [];
        let byName = 0;

        for(const symbol of entry.symbols)
        {
            if(wordRegExp(symbol.name).test(text))
            {
                byName++;
                continue;
            }

            const alias = (namesOf.get(symbol.name) ?? [])
                .filter(n => !GENERIC_SELECTOR_NAMES.has(n) && owners.get(n)?.size === 1)
                .find(n => wordRegExp(n).test(text));

            if(alias)
            {
                viaSelector.push({name: symbol.name, via: alias});
            }
            else
            {
                missing.push(symbol);
            }
        }

        return {importPath: entry.importPath, total: entry.symbols.length, byName, viaSelector, missing};
    });
}

/**
 * Structural checks of generated skill: frontmatter, sizes, contents lists, pointers.
 * @param {string} skillDir
 * @returns {string[]}
 */
export function skillChecks(skillDir)
{
    const problems = [];
    const skillFile = path.join(skillDir, 'SKILL.md');

    if(!fs.existsSync(skillFile))
    {
        return ['SKILL.md not found'];
    }

    const skill = readText(skillFile);
    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/)?.[1];

    if(!frontmatter)
    {
        problems.push('SKILL.md: missing YAML frontmatter at the very start');
    }
    else
    {
        //description: folded/literal block or single line
        const descMatch = frontmatter.match(/^description:\s*(?:[>|][-+]?\s*\n((?:[ \t]+.*\n?)+)|(.*))/m);
        const description = (descMatch?.[1] ?? descMatch?.[2] ?? '').split('\n').map(l => l.trim()).filter(Boolean).join(' ').replace(/^['"]|['"]$/g, '');

        if(!description)
        {
            problems.push('SKILL.md: missing description');
        }
        else if(description.length > 1024)
        {
            problems.push(`SKILL.md: description has ${description.length} chars (limit 1024)`);
        }

        if(!/^metadata:\s*\n(?:[ \t]+.*\n)*?[ \t]+version:\s*['"]?\d/m.test(`${frontmatter}\n`))
        {
            problems.push('SKILL.md: missing metadata.version in frontmatter');
        }
    }

    if(!/Created for \*\*[^*]+ v\d/.test(skill))
    {
        problems.push('SKILL.md: missing "Created for **<package> v<version>**" line');
    }

    const lineCount = skill.trimEnd().split('\n').length;

    if(lineCount > 200)
    {
        problems.push(`SKILL.md: ${lineCount} lines - move details to references (aim for <=200)`);
    }

    const files = skillFiles(skillDir);
    const texts = new Map(files.map(f => [f, readText(f)]));

    for(const [file, content] of texts)
    {
        if(!file.endsWith('.md'))
        {
            continue;
        }

        const rel = path.relative(skillDir, file).split(path.sep).join('/');
        const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');
        const firstH2 = body.match(/^##\s+(.*)$/m)?.[1]?.trim();

        if(!firstH2 || !/^(contents|table of contents)$/i.test(firstH2))
        {
            problems.push(`${rel}: first "##" section should be "## Contents" (ToC at start)`);
        }

        if(rel !== 'SKILL.md' && body.split('\n').length > 500)
        {
            problems.push(`${rel}: ${body.split('\n').length} lines - consider splitting by area`);
        }
    }

    //pointers: every bundled file path cited in markdown exists (placeholders like `x-<area>.md` and directory mentions skipped)
    const mdText = [...texts.entries()].filter(([f]) => f.endsWith('.md')).map(([, t]) => t).join('\n');

    for(const cited of new Set([...mdText.matchAll(/(?<![\w/.-])((?:references|assets|scripts)\/[\w./-]*\.[a-z]+)(?![\w<-])/g)].map(m => m[1])))
    {
        if(!fs.existsSync(path.join(skillDir, cited)))
        {
            problems.push(`broken pointer: ${cited} does not exist`);
        }
    }

    //every bundled file is reachable: referenced from some other skill file
    for(const file of files)
    {
        const rel = path.relative(skillDir, file).split(path.sep).join('/');

        if(rel === 'SKILL.md' || !/^(references|assets|scripts)\//.test(rel))
        {
            continue;
        }

        const referenced = [...texts.entries()].some(([other, content]) => other !== file && content.includes(rel));

        if(!referenced)
        {
            problems.push(`${rel} is not referenced from SKILL.md or any other skill file`);
        }
    }

    return problems;
}

//######################### commands #########################

/**
 * @param {string[]} argv
 */
export function main(argv)
{
    const positional = argv.filter(a => !a.startsWith('--'));
    const json = argv.includes('--json');
    const [command, repoArg, skillArg] = positional;

    if(!command || !repoArg || !['info', 'inventory', 'coverage'].includes(command))
    {
        console.error('Usage: node package-api.mjs <info|inventory|coverage> <package-repo> [skill-dir] [--json]   (SKIP_NPM=1 to skip npm)');
        return 1;
    }

    const repo = path.resolve(repoArg);

    if(!fs.existsSync(path.join(repo, 'package.json')))
    {
        console.error(`No package.json in ${repo}`);
        return 1;
    }

    if(command === 'info')
    {
        const pkg = readJson(path.join(repo, 'package.json'));
        const {entries, manual, styles} = findEntryPoints(repo, pkg);

        console.log(JSON.stringify(
        {
            name: pkg.name,
            description: pkg.description,
            version: resolveVersion(repo, pkg),
            dependencies: pkg.dependencies ?? {},
            peerDependencies: pkg.peerDependencies ?? {},
            optionalDependencies: pkg.optionalDependencies ?? {},
            entryPoints: entries.map(e => ({importPath: e.importPath, index: path.relative(repo, e.index)})),
            entryPointsForManualReview: manual,
            stylesExports: styles,
            hasReadme: ['readme.md', 'README.md'].find(f => fs.existsSync(path.join(repo, f))) ?? null,
            hasChangelog: ['changelog.md', 'CHANGELOG.md'].find(f => fs.existsSync(path.join(repo, f))) ?? null,
            hasStyles: fs.existsSync(path.join(repo, 'styles')),
            hasDemo: fs.existsSync(path.join(repo, 'demo')),
        }, null, 4));

        return 0;
    }

    if(command === 'inventory')
    {
        const result = inventory(repo);
        const {manual} = findEntryPoints(repo, readJson(path.join(repo, 'package.json')));

        if(json)
        {
            console.log(JSON.stringify({entryPoints: result, entryPointsForManualReview: manual}, null, 4));
            return 0;
        }

        for(const entry of result)
        {
            console.log(`\n## ${entry.importPath}  (${entry.symbols.length} exports, ${entry.index})`);

            /** @type {Record<string, string[]>} */
            const byKind = {};

            for(const symbol of entry.symbols)
            {
                (byKind[symbol.kind] ??= []).push(symbol.name);
            }

            for(const [kind, names] of Object.entries(byKind))
            {
                console.log(`- ${kind} (${names.length}): ${names.join(', ')}`);
            }
        }

        for(const m of manual)
        {
            console.log(`\n## ${m.importPath}  MANUAL REVIEW: ${m.reason}`);
        }

        return 0;
    }

    if(!skillArg || !fs.existsSync(skillArg))
    {
        console.error('coverage needs an existing <skill-dir>');
        return 1;
    }

    const skillDir = path.resolve(skillArg);
    const result = coverage(repo, skillDir);
    const checks = skillChecks(skillDir);
    const {manual} = findEntryPoints(repo, readJson(path.join(repo, 'package.json')));

    if(json)
    {
        console.log(JSON.stringify({entryPoints: result, entryPointsForManualReview: manual, skillChecks: checks}, null, 4));
        return 0;
    }

    for(const entry of result)
    {
        console.log(`\n## ${entry.importPath}: ${entry.byName + entry.viaSelector.length}/${entry.total} exports mentioned (${entry.byName} by name, ${entry.viaSelector.length} via selector/pipe name)`);

        for(const v of entry.viaSelector)
        {
            console.log(`- via selector: ${v.name} as "${v.via}" - spot-check it is really described`);
        }

        for(const m of entry.missing)
        {
            console.log(`- MISSING ${m.kind} ${m.name}  (${m.file})`);
        }
    }

    for(const m of manual)
    {
        console.log(`\n## ${m.importPath}: MANUAL REVIEW - ${m.reason}`);
    }

    console.log(`\n## skill checks: ${checks.length ? `${checks.length} problem(s)` : 'ok'}`);

    for(const check of checks)
    {
        console.log(`- ${check}`);
    }

    return 0;
}

if(import.meta.url === pathToFileURL(process.argv[1] ?? '').href)
{
    process.exitCode = main(process.argv.slice(2));
}
