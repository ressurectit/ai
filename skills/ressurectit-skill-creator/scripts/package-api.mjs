#!/usr/bin/env node
//@ts-check

/**
 * Public API inventory and skill coverage check for RessurectIT packages.
 *
 * Usage:
 *   node package-api.mjs info <package-repo>
 *       Package name, resolved version (with its source), peer/optional deps, entry points.
 *   node package-api.mjs inventory <package-repo> [--json]
 *       Every public export of every entry point, grouped by entry point and kind.
 *   node package-api.mjs coverage <package-repo> <skill-dir> [--json]
 *       Which public exports are mentioned (as whole words) anywhere in the skill's files.
 *
 * Only node built-ins are used, no build of the package is needed (source .ts is parsed with regexes).
 */

import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';

const IGNORED_DIRS = new Set(['node_modules', 'demo', 'src', 'styles', 'docs', 'temp', 'es2015', 'es2020', 'es2022', 'typings', '.git']);

//######################### helpers #########################

/**
 * @param {string} file
 */
function readJson(file)
{
    return JSON.parse(fs.readFileSync(file, 'utf8'));
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
 * Resolves version of package. RessurectIT repos keep `0.0.0-placeholder` in package.json and version comes from git tags.
 * @param {string} repo
 * @param {any} pkg
 */
function resolveVersion(repo, pkg)
{
    const result = {version: /** @type {string|null} */(null), source: '', gitDescribe: tryExec('git describe --tags', repo), changelogTop: /** @type {string|null} */(null), npmLatest: /** @type {string|null} */(null), notes: /** @type {string[]} */([])};

    const changelogFile = ['changelog.md', 'CHANGELOG.md'].map(f => path.join(repo, f)).find(f => fs.existsSync(f));

    if(changelogFile)
    {
        const match = fs.readFileSync(changelogFile, 'utf8').match(/^##\s+Version\s+([^\s(]+)/mi);
        result.changelogTop = match?.[1] ?? null;
    }

    if(pkg.version && !/placeholder/.test(pkg.version))
    {
        result.version = pkg.version;
        result.source = 'package.json';
    }
    else
    {
        const tag = tryExec('git describe --tags --abbrev=0', repo);

        if(tag)
        {
            result.version = tag.replace(/^v/, '');
            result.source = `git tag ${tag}`;
        }
        else if(result.changelogTop)
        {
            result.version = result.changelogTop;
            result.source = 'changelog.md';
        }
    }

    if(process.env.SKIP_NPM !== '1')
    {
        result.npmLatest = tryExec(`npm view ${pkg.name} version`, repo);
    }

    if(result.gitDescribe && result.version && !new RegExp(`^v?${result.version.replace(/\./g, '\\.')}$`).test(result.gitDescribe))
    {
        result.notes.push(`HEAD is past the tag (${result.gitDescribe}) - see changedSinceTag; docs-only changes are usually safe to use.`);
        const tag = tryExec('git describe --tags --abbrev=0', repo);
        const changed = tag ? tryExec(`git diff --name-only ${tag}..HEAD`, repo) : null;
        const uncommitted = tryExec('git status --short', repo);
        /** @type {any} */(result).changedSinceTag = changed ? changed.split('\n') : [];
        /** @type {any} */(result).uncommitted = uncommitted ? uncommitted.split('\n') : [];
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
 * Finds entry points: root `src/index.ts` and every sub directory with package.json + src/index.ts.
 * @param {string} repo
 * @param {string} name
 */
function findEntryPoints(repo, name)
{
    /** @type {{importPath: string, index: string}[]} */
    const entries = [];

    const rootIndex = ['src/index.ts', 'index.ts', 'src/public-api.ts', 'public-api.ts'].map(f => path.join(repo, f)).find(f => fs.existsSync(f));

    if(rootIndex)
    {
        entries.push({importPath: name, index: rootIndex});
    }

    for(const dir of fs.readdirSync(repo, {withFileTypes: true}))
    {
        if(!dir.isDirectory() || IGNORED_DIRS.has(dir.name) || dir.name.startsWith('.'))
        {
            continue;
        }

        const subRoot = path.join(repo, dir.name);
        const index = ['src/index.ts', 'index.ts', 'src/public-api.ts'].map(f => path.join(subRoot, f)).find(f => fs.existsSync(f));

        if(index && fs.existsSync(path.join(subRoot, 'package.json')))
        {
            entries.push({importPath: `${name}/${dir.name}`, index});
        }
    }

    return entries;
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

/**
 * Collects exported symbols from file, following relative re-exports.
 * @param {string} file
 * @param {Map<string, {kind: string, file: string}>} out
 * @param {Set<string>} visited
 */
function collectExports(file, out, visited)
{
    if(visited.has(file))
    {
        return;
    }

    visited.add(file);

    const source = fs.readFileSync(file, 'utf8')
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

        if(match[2].startsWith('.'))
        {
            const resolved = resolveModule(file, match[2]);

            if(resolved)
            {
                collectExports(resolved, out, visited);
            }
        }
    }

    //export {a, b as c} from './x'; export {a, b}; export type {X}
    for(const match of source.matchAll(/export\s+(type\s+)?\{([^}]*)\}\s*(?:from\s*['"]([^'"]+)['"])?/g))
    {
        for(const part of match[2].split(','))
        {
            const cleaned = part.trim().replace(/^type\s+/, '');

            if(!cleaned)
            {
                continue;
            }

            const exportedName = cleaned.split(/\s+as\s+/).pop()?.trim();

            if(exportedName && exportedName !== 'default')
            {
                out.set(exportedName, {kind: match[1] ? 'type' : 're-export', file});
            }
        }
    }

    //export [declare] [abstract] class|interface|type|enum|function|const|let|var Name
    for(const match of source.matchAll(/export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(class|interface|type|enum|function\*?|const\s+enum|const|let|var)\s+([A-Za-z_$][\w$]*)/g))
    {
        out.set(match[2], {kind: match[1].replace(/\s+/g, ' ').replace('*', ''), file});
    }
}

/**
 * Extracts template-facing names (selectors, pipe names) of class declared in file, so symbol used only by selector counts as covered.
 * @param {string} repo
 * @param {string} file
 * @param {string} className
 * @returns {string[]}
 */
function templateAliases(repo, file, className)
{
    const source = fs.readFileSync(path.join(repo, file), 'utf8');
    const classIndex = source.search(new RegExp(`class\\s+${className}\\b`));

    if(classIndex < 0)
    {
        return [];
    }

    //decorator closest before class declaration
    const before = source.slice(0, classIndex);
    const decoratorStart = Math.max(before.lastIndexOf('@Component('), before.lastIndexOf('@Directive('), before.lastIndexOf('@Pipe('));

    if(decoratorStart < 0)
    {
        return [];
    }

    const decorator = before.slice(decoratorStart);
    const aliases = [];
    const selector = decorator.match(/selector\s*:\s*['"`]([^'"`]+)['"`]/)?.[1];
    const pipeName = decorator.match(/name\s*:\s*['"`]([^'"`]+)['"`]/)?.[1];

    if(selector)
    {
        for(const part of selector.split(','))
        {
            //take attribute/element names, e.g. 'div[ngGrid][data]' -> ngGrid, data; prefer first meaningful
            const names = [...part.matchAll(/\[([\w-]+)[^\]]*\]|^([\w-]+)/g)].map(m => m[1] ?? m[2]).filter(n => n && !['div', 'span', 'table', 'input', 'button', 'ng-container', 'ng-template'].includes(n));
            aliases.push(...names);
        }
    }

    if(pipeName && decoratorStart === before.lastIndexOf('@Pipe('))
    {
        aliases.push(pipeName);
    }

    return [...new Set(aliases)];
}

/**
 * @param {string} repo
 */
function inventory(repo)
{
    const pkg = readJson(path.join(repo, 'package.json'));

    return findEntryPoints(repo, pkg.name).map(entry =>
    {
        /** @type {Map<string, {kind: string, file: string}>} */
        const symbols = new Map();
        collectExports(entry.index, symbols, new Set());

        return {
            importPath: entry.importPath,
            index: path.relative(repo, entry.index),
            symbols: [...symbols.entries()]
                .map(([symbol, info]) => ({name: symbol, kind: info.kind, file: path.relative(repo, info.file)}))
                .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)),
        };
    });
}

/**
 * @param {string} dir
 * @returns {string}
 */
function readAllText(dir)
{
    let text = '';

    for(const entry of fs.readdirSync(dir, {withFileTypes: true}))
    {
        const full = path.join(dir, entry.name);

        if(entry.isDirectory())
        {
            if(entry.name !== 'node_modules' && !entry.name.endsWith('-workspace') && entry.name !== 'evals')
            {
                text += readAllText(full);
            }
        }
        else if(/\.(md|ts|html|scss|css|json|txt)$/.test(entry.name))
        {
            text += `\n${fs.readFileSync(full, 'utf8')}`;
        }
    }

    return text;
}

/**
 * Structural checks of generated skill: frontmatter, sizes, contents lists.
 * @param {string} skillDir
 * @returns {string[]}
 */
function skillChecks(skillDir)
{
    const problems = [];
    const skillFile = path.join(skillDir, 'SKILL.md');

    if(!fs.existsSync(skillFile))
    {
        return ['SKILL.md not found'];
    }

    const skill = fs.readFileSync(skillFile, 'utf8');
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

        if(!/^\s+version:\s*['"]?\d/m.test(frontmatter))
        {
            problems.push('SKILL.md: missing metadata.version in frontmatter');
        }
    }

    if(!/Created for \*\*[^*]+ v\d/.test(skill))
    {
        problems.push('SKILL.md: missing "Created for **<package> v<version>**" line');
    }

    const lines = skill.trimEnd().split('\n').length;

    if(lines > 200)
    {
        problems.push(`SKILL.md: ${lines} lines - move details to references (aim for <=200)`);
    }

    //pointers: every cited bundled file exists, every bundled file is reachable from SKILL.md
    const allText = readAllText(skillDir);

    for(const cited of new Set([...allText.matchAll(/\b((?:references|assets|scripts)\/[\w./-]+\.\w+)/g)].map(m => m[1])))
    {
        if(!fs.existsSync(path.join(skillDir, cited)) && !cited.includes('<'))
        {
            problems.push(`broken pointer: ${cited} does not exist`);
        }
    }

    for(const sub of ['references', 'assets', 'scripts'])
    {
        const subDir = path.join(skillDir, sub);

        if(!fs.existsSync(subDir))
        {
            continue;
        }

        for(const name of fs.readdirSync(subDir))
        {
            if(!skill.includes(`${sub}/${name}`))
            {
                problems.push(`${sub}/${name} is not referenced from SKILL.md`);
            }
        }
    }

    /**
     * @param {string} dir
     * @returns {string[]}
     */
    const mdFiles = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e =>
    {
        const full = path.join(dir, e.name);

        if(e.isDirectory())
        {
            return e.name === 'evals' || e.name.endsWith('-workspace') ? [] : mdFiles(full);
        }

        return e.name.endsWith('.md') ? [full] : [];
    });

    for(const file of mdFiles(skillDir))
    {
        const rel = path.relative(skillDir, file);
        const content = fs.readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
        const fileLines = content.split('\n').length;
        //first level-2 heading must be Contents (ToC at start)
        const firstH2 = content.match(/^##\s+(.*)$/m)?.[1]?.trim();

        if(!firstH2 || !/^(contents|table of contents)$/i.test(firstH2))
        {
            problems.push(`${rel}: first "##" section should be "## Contents" (ToC at start)`);
        }

        if(rel.startsWith('references') && fileLines > 500)
        {
            problems.push(`${rel}: ${fileLines} lines - consider splitting by area`);
        }
    }

    return problems;
}

//######################### commands #########################

const [command, repoArg, thirdArg] = process.argv.slice(2);
const json = process.argv.includes('--json');

if(!command || !repoArg || !['info', 'inventory', 'coverage'].includes(command))
{
    console.error('Usage: node package-api.mjs <info|inventory|coverage> <package-repo> [skill-dir] [--json]');
    process.exit(1);
}

const repo = path.resolve(repoArg);

if(!fs.existsSync(path.join(repo, 'package.json')))
{
    console.error(`No package.json in ${repo}`);
    process.exit(1);
}

if(command === 'info')
{
    const pkg = readJson(path.join(repo, 'package.json'));
    const info =
    {
        name: pkg.name,
        description: pkg.description,
        version: resolveVersion(repo, pkg),
        dependencies: pkg.dependencies ?? {},
        peerDependencies: pkg.peerDependencies ?? {},
        optionalDependencies: pkg.optionalDependencies ?? {},
        entryPoints: findEntryPoints(repo, pkg.name).map(e => ({importPath: e.importPath, index: path.relative(repo, e.index)})),
        hasReadme: ['readme.md', 'README.md'].find(f => fs.existsSync(path.join(repo, f))) ?? null,
        hasChangelog: ['changelog.md', 'CHANGELOG.md'].find(f => fs.existsSync(path.join(repo, f))) ?? null,
        hasStyles: fs.existsSync(path.join(repo, 'styles')),
        hasDemo: fs.existsSync(path.join(repo, 'demo')),
    };

    console.log(JSON.stringify(info, null, 4));
}
else if(command === 'inventory')
{
    const result = inventory(repo);

    if(json)
    {
        console.log(JSON.stringify(result, null, 4));
    }
    else
    {
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
    }
}
else
{
    if(!thirdArg || !fs.existsSync(thirdArg))
    {
        console.error('coverage needs an existing <skill-dir>');
        process.exit(1);
    }

    const text = readAllText(path.resolve(thirdArg));
    const result = inventory(repo).map(entry =>
    {
        const mentioned = (/** @type {string} */ name) => new RegExp(`(^|[^\\w$-])${name.replace(/\$/g, '\\$')}([^\\w$-]|$)`).test(text);
        const missing = entry.symbols.filter(s => !mentioned(s.name) && !(s.kind === 'class' && templateAliases(repo, s.file, s.name).some(mentioned)));

        return {
            importPath: entry.importPath,
            total: entry.symbols.length,
            covered: entry.symbols.length - missing.length,
            missing: missing.map(m => ({name: m.name, kind: m.kind, file: m.file})),
        };
    });

    if(json)
    {
        console.log(JSON.stringify({entryPoints: result, skillChecks: skillChecks(path.resolve(thirdArg))}, null, 4));
    }
    else
    {
        for(const entry of result)
        {
            console.log(`\n## ${entry.importPath}: ${entry.covered}/${entry.total} exports mentioned`);

            for(const m of entry.missing)
            {
                console.log(`- MISSING ${m.kind} ${m.name}  (${m.file})`);
            }
        }

        const checks = skillChecks(path.resolve(thirdArg));
        console.log(`\n## skill checks: ${checks.length ? `${checks.length} problem(s)` : 'ok'}`);

        for(const check of checks)
        {
            console.log(`- ${check}`);
        }
    }
}
