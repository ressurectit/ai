#!/usr/bin/env node
// Lists dynamic items of @anglr/dynamic packages with everything needed to write metadata by hand:
// package + name, kind (layout / relations / both), options interfaces, where children live (descendants),
// child extension options, extensions, relations inputs/outputs, default options from editor metadata.
//
// Works on:
//   - installed package:   node dynamic-items.mjs node_modules/@anglr/dynamic
//   - library repository:  node dynamic-items.mjs ~/git/ng-dynamic
//   - own project package: node dynamic-items.mjs src/app/myComponents
//
// Options:
//   --package <pkg>   only items of this package name (e.g. basic-components)
//   --item <name>     only items with this name (e.g. stackPanel)
//   --json            print JSON instead of markdown
//   --brief           one line per item (package, name, kind, descendants, endpoints)

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flags = {json: false, brief: false, package: null, item: null};
const positional = [];

for(let i = 0; i < args.length; i++)
{
    const a = args[i];

    if(a === '--json') flags.json = true;
    else if(a === '--brief') flags.brief = true;
    else if(a === '--package') flags.package = args[++i];
    else if(a === '--item') flags.item = args[++i];
    else if(a === '-h' || a === '--help')
    {
        console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 16).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
        process.exit(0);
    }
    else positional.push(a);
}

const root = path.resolve(positional[0] ?? '.');

if(!fs.existsSync(root))
{
    console.error(`Path not found: ${root}`);
    process.exit(1);
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'demo', 'es2022', 'temp', 'docs', 'documentation', 'schematics', 'dist', '.angular']);

//######################### file helpers #########################

function read(file)
{
    try
    {
        return fs.readFileSync(file, 'utf8');
    }
    catch
    {
        return null;
    }
}

function list(dir)
{
    try
    {
        return fs.readdirSync(dir, {withFileTypes: true});
    }
    catch
    {
        return [];
    }
}

/** JS mirror of a directory inside installed/built package (es2022/<rel>) */
function mirrorOf(dir)
{
    const rel = path.relative(root, dir);
    const mirror = path.join(root, 'es2022', rel);

    return fs.existsSync(mirror) ? mirror : null;
}

/** Files in dir (and its JS mirror) matching predicate on base name; source .ts preferred */
function filesIn(dir, predicate, recursive = false)
{
    const result = [];
    const walk = (d) =>
    {
        for(const e of list(d))
        {
            const full = path.join(d, e.name);

            if(e.isDirectory())
            {
                if(recursive) walk(full);
                continue;
            }

            if(predicate(e.name)) result.push(full);
        }
    };

    walk(dir);

    const mirror = mirrorOf(dir);

    if(mirror)
    {
        const walkMirror = (d) =>
        {
            for(const e of list(d))
            {
                const full = path.join(d, e.name);

                if(e.isDirectory())
                {
                    if(recursive) walkMirror(full);
                    continue;
                }

                if(predicate(e.name)) result.push(full);
            }
        };

        walkMirror(mirror);
    }

    return result;
}

const isSource = n => n.endsWith('.ts') && !n.endsWith('.d.ts');
const isDts = n => n.endsWith('.d.ts');
const isJs = n => n.endsWith('.js');
const isCode = n => isSource(n) || isJs(n);
const stem = n => n.replace(/\.d\.ts$|\.ts$|\.js$/, '');

/** Concatenated code (sources and JS mirror, no .d.ts) of files whose stem matches */
function codeOf(dir, stemPredicate, recursive = false)
{
    const files = filesIn(dir, n => isCode(n) && stemPredicate(stem(n)), recursive);
    const sources = files.filter(f => isSource(f));

    return (sources.length ? sources : files).map(f => read(f) ?? '').join('\n');
}

/** Typings: .ts sources, otherwise .d.ts */
function typingsOf(dir, stemPredicate)
{
    const src = filesIn(dir, n => isSource(n) && stemPredicate(stem(n)));

    if(src.length) return src.map(f => read(f) ?? '').join('\n');

    return filesIn(dir, n => isDts(n) && stemPredicate(stem(n))).map(f => read(f) ?? '').join('\n');
}

function htmlOf(dir, recursive = true)
{
    return filesIn(dir, n => n.endsWith('.html'), recursive).map(f => read(f) ?? '').join('\n');
}

//######################### parsing helpers #########################

/** Returns balanced text starting at index of opening bracket */
function balanced(text, start)
{
    const open = text[start];
    const close = {'(': ')', '{': '}', '[': ']'}[open];
    let depth = 0;
    let quote = null;

    for(let i = start; i < text.length; i++)
    {
        const c = text[i];

        if(quote)
        {
            if(c === '\\') { i++; continue; }
            if(c === quote) quote = null;
            continue;
        }

        if(c === '\'' || c === '"' || c === '`') { quote = c; continue; }
        if(c === open) depth++;
        else if(c === close)
        {
            depth--;

            if(depth === 0) return text.slice(start, i + 1);
        }
    }

    return null;
}

function stripComments(text)
{
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function squash(text, max = 400)
{
    const s = stripComments(text).replace(/\s+/g, ' ').trim();

    return s.length > max ? s.slice(0, max) + ' …' : s;
}

/** Parses exported interfaces: name, extends, properties with type and first doc line */
function parseInterfaces(text)
{
    const result = [];
    const re = /export\s+(?:declare\s+)?interface\s+(\w+)(<[^{]*?>)?(?:\s+extends\s+([^{]+))?\s*\{/g;
    let m;

    while((m = re.exec(text)))
    {
        const body = balanced(text, re.lastIndex - 1) ?? '';
        const props = [];
        const propRe = /(\/\*\*([\s\S]*?)\*\/\s*)?(?:readonly\s+)?(\w+)(\??)\s*:\s*([^;]+);/g;
        let p;
        const inner = body.slice(1, -1);

        while((p = propRe.exec(inner)))
        {
            const doc = (p[2] ?? '').split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim()).filter(l => l && !l.startsWith('@')).join(' ');

            props.push({name: p[3], optional: !!p[4], type: p[5].replace(/\s+/g, ' ').trim(), doc});
        }

        result.push({name: m[1], extends: m[3]?.trim() ?? null, props});
    }

    return result;
}

/** Parses `name: value` property assignment (class field or object literal) returning balanced value text */
function findAssigned(text, prop)
{
    const re = new RegExp(`\\b${prop}\\??\\s*(?::[^=;{\\[(]*?)??[=:]\\s*`, 'g');
    let m;

    while((m = re.exec(text)))
    {
        let i = re.lastIndex;

        while(text[i] === ' ' || text[i] === '\n' || text[i] === '\r') i++;

        //arrow function or object/array literal
        const rest = text.slice(i);
        const arrow = /^(\([^)]*\)|\w+)\s*=>\s*/.exec(rest);

        if(arrow)
        {
            const bodyStart = i + arrow[0].length;

            if('{(['.includes(text[bodyStart]))
            {
                return text.slice(i, bodyStart) + (balanced(text, bodyStart) ?? '');
            }

            return text.slice(i, text.indexOf(';', bodyStart) >= 0 ? text.indexOf(';', bodyStart) : bodyStart + 200);
        }

        if('{['.includes(text[i]))
        {
            return balanced(text, i);
        }
    }

    return null;
}

function findDecoratorArgs(text, decorator)
{
    const result = [];
    const re = new RegExp(`${decorator}\\s*(<[^(]*?>)?\\s*\\(`, 'g');
    let m;

    while((m = re.exec(text)))
    {
        const args = balanced(text, re.lastIndex - 1);

        if(args) result.push(args.slice(1, -1).trim());
    }

    return result;
}

function unique(arr)
{
    return [...new Set(arr)];
}

/** Outputs: @DynamicOutput() in TS sources or __decorate([DynamicOutput(...)], X.prototype, "name") in JS */
function parseOutputs(code)
{
    const outputs = [];
    const tsRe = /@DynamicOutput\s*\(([^)]*)\)\s*(?:public\s+|protected\s+|override\s+)*(\w+)/g;
    const jsRe = /DynamicOutput\s*\(([^)]*)\)[\s\S]{0,200}?\],\s*\w+\.prototype,\s*["'](\w+)["']/g;
    let m;

    while((m = tsRe.exec(code))) outputs.push({name: m[2], options: m[1].replace(/\s+/g, ' ').trim()});
    while((m = jsRe.exec(code))) outputs.push({name: m[2], options: m[1].replace(/\s+/g, ' ').trim()});

    const seen = new Map();

    for(const o of outputs) if(!seen.has(o.name)) seen.set(o.name, o);

    return [...seen.values()];
}

function parseDebugData(code)
{
    const result = {inputs: [], outputs: []};

    for(const args of findDecoratorArgs(code, 'DebugData'))
    {
        for(const kind of ['inputs', 'outputs'])
        {
            const arr = findAssigned(args, kind);

            if(!arr) continue;

            for(const m of arr.matchAll(/['"](\w+)['"]/g)) result[kind].push(m[1]);
        }
    }

    return result;
}

function parseNodeEndpoints(html)
{
    const inputs = [];
    const outputs = [];
    const dynamicInputs = [];
    const dynamicOutputs = [];

    for(const m of html.matchAll(/<relation-node-(input|output)(?:-debug)?\b([^>]*)>/g))
    {
        const attrs = m[2];
        const stat = /(?:^|\s)name="([^"]+)"/.exec(attrs);
        const dyn = /\[name\]="([^"]+)"/.exec(attrs);

        if(stat) (m[1] === 'input' ? inputs : outputs).push(stat[1]);
        if(dyn) (m[1] === 'input' ? dynamicInputs : dynamicOutputs).push(dyn[1]);
    }

    return {inputs: unique(inputs), outputs: unique(outputs), dynamicInputs: unique(dynamicInputs), dynamicOutputs: unique(dynamicOutputs)};
}

function parseExportedArray(code, name)
{
    const m = new RegExp(`export\\s+const\\s+${name}\\s*(?::[^=]+)?=\\s*\\[([^\\]]*)\\]`).exec(code);

    return m ? m[1].split(',').map(s => s.trim()).filter(Boolean) : [];
}

//######################### package name detection #########################

const packageCache = new Map();

/** Finds package names served by DynamicModuleProviders near item directory */
function detectPackages(itemDir)
{
    let dir = path.dirname(itemDir);

    for(let depth = 0; depth < 5 && dir.startsWith(root); depth++, dir = path.dirname(dir))
    {
        if(packageCache.has(dir)) 
        {
            const cached = packageCache.get(dir);

            if(cached.length) return cached;
            continue;
        }

        const found = [];
        const allCandidates = filesIn(dir, n => isCode(n), true).filter(f => !f.includes(`${path.sep}dynamicItems${path.sep}`));
        const srcCandidates = allCandidates.filter(f => isSource(f));
        const candidates = srcCandidates.length ? srcCandidates : allCandidates;

        for(const f of candidates)
        {
            const text = read(f) ?? '';

            if(!text.includes('tryToGet')) continue;

            const items = /ItemsProvider/i.test(path.basename(f));
            const mentionsItem = new RegExp(`case\\s+['"]${path.basename(itemDir)}['"]`).test(text);

            for(const m of text.matchAll(/source\.package\s*(?:!==?|===?)\s*['"]([\w@/.-]+)['"]/g)) found.push({pkg: m[1], items, mentionsItem});
            //switch(source.package) { case 'x': }
            if(/switch\s*\(\s*source\.package\s*\)/.test(text))
            {
                for(const m of text.matchAll(/case\s+['"]([\w@/.-]+)['"]\s*:/g)) found.push({pkg: m[1], items, mentionsItem});
            }
        }

        const mentioning = found.filter(f => f.mentionsItem && f.pkg !== path.basename(itemDir));
        const itemsProviders = found.filter(f => f.items);
        const pkgs = unique((mentioning.length ? mentioning : itemsProviders.length ? itemsProviders : found).map(f => f.pkg))
            .filter(p => p !== path.basename(itemDir));

        if(mentioning.length)
        {
            return pkgs;
        }

        packageCache.set(dir, pkgs);

        if(pkgs.length) return pkgs;
    }

    return [];
}

//######################### item discovery #########################

function findItemDirs(dir, acc = [])
{
    const entries = list(dir);

    if(entries.some(e => e.isFile() && /^type\.(ts|d\.ts|js)$/.test(e.name)))
    {
        acc.push(dir);
    }

    for(const e of entries)
    {
        if(e.isDirectory() && !SKIP_DIRS.has(e.name))
        {
            findItemDirs(path.join(dir, e.name), acc);
        }
    }

    return acc;
}

function analyzeItem(dir)
{
    const name = path.basename(dir);
    const typeCode = codeOf(dir, s => s === 'type') || typingsOf(dir, s => s === 'type');
    const componentCode = codeOf(dir, s => s.endsWith('.component') && !s.endsWith('Node.component') && !s.endsWith('Designer.component'));
    const relationsCode = codeOf(dir, s => s.endsWith('.relations'));
    const allClassCode = componentCode + '\n' + relationsCode;
    const optionsText = typingsOf(dir, s => s.endsWith('.options'));
    const layoutMeta = codeOf(path.join(dir, 'metadata'), s => s.endsWith('.layoutMetadata'));
    const relationsMeta = codeOf(path.join(dir, 'metadata'), s => s.endsWith('.relationsMetadata'));
    const nodeHtml = htmlOf(path.join(dir, 'node')) + '\n' + codeOf(path.join(dir, 'node'), () => true);
    const componentHtml = filesIn(dir, n => n.endsWith('.component.html') && !n.includes('Node.') && !n.includes('Designer.')).map(f => read(f) ?? '').join('\n');

    const extensions = parseExportedArray(typeCode, 'extensions');
    const childExtensions = parseExportedArray(typeCode, 'childExtensions');
    const pure = /PureRelationsComponent\s*\(/.test(allClassCode);
    const hasComponent = componentCode.trim().length > 0 || filesIn(dir, n => /\.component\.d\.ts$/.test(n) && !n.includes('Node.')).length > 0;
    const registersRelations = extensions.some(e => /RelationsRegistration/.test(e)) || /RelationsEditorMetadata\s*\(/.test(componentCode);

    let kind = 'unknown';

    if(pure) kind = 'relations (pure node)';
    else if(hasComponent && registersRelations) kind = 'layout + relations';
    else if(hasComponent) kind = 'layout';
    else if(relationsCode.trim()) kind = 'relations';

    const descendants = findDecoratorArgs(componentCode, 'DescendantsGetter');
    const addDescendant = layoutMeta ? findAssigned(layoutMeta, 'addDescendant') : null;
    const layoutDefaults = layoutMeta ? findAssigned(layoutMeta, 'defaultOptions') : null;
    const relationsDefaults = relationsMeta ? findAssigned(relationsMeta, 'defaultOptions') : null;
    const scoped = /\bscoped\s*:\s*true/.test(layoutMeta);
    const childProps = /childPropertiesMetadata/.test(layoutMeta);
    const renderedOptions = unique([...componentHtml.matchAll(/layoutComponentRenderer\]?="([^"]+)"/g)].map(m => m[1]));

    const outputs = parseOutputs(allClassCode);
    const debug = parseDebugData(allClassCode);
    const node = parseNodeEndpoints(nodeHtml);
    const inputs = unique([...node.inputs, ...debug.inputs]);
    const outputNames = unique([...outputs.map(o => o.name), ...node.outputs, ...debug.outputs]);

    const packages = detectPackages(dir);

    return {
        package: packages.length === 1 ? packages[0] : (packages.length ? packages.join('|') : '?'),
        name,
        kind,
        dir: path.relative(root, dir) || '.',
        options: parseInterfaces(optionsText),
        descendants: descendants.map(d => squash(d, 200)),
        addDescendant: addDescendant ? squash(addDescendant, 300) : null,
        renderedOptions,
        scoped,
        childPropertiesMetadata: childProps,
        extensions,
        childExtensions,
        relations:
        {
            inputs,
            outputs: outputNames.map(n => ({name: n, options: outputs.find(o => o.name === n)?.options ?? ''})),
            dynamicInputs: node.dynamicInputs,
            dynamicOutputs: node.dynamicOutputs,
        },
        layoutDefaults: layoutDefaults ? squash(layoutDefaults) : null,
        relationsDefaults: relationsDefaults ? squash(relationsDefaults) : null,
    };
}

//######################### output #########################

let items = findItemDirs(root).map(analyzeItem);

if(flags.package) items = items.filter(i => i.package.split('|').includes(flags.package));
if(flags.item) items = items.filter(i => i.name === flags.item);

items.sort((a, b) => a.package.localeCompare(b.package) || a.name.localeCompare(b.name));

if(flags.json)
{
    console.log(JSON.stringify(items, null, 4));
    process.exit(0);
}

if(!items.length)
{
    console.log(`No dynamic items found under ${root} (looking for folders with type.ts / type.d.ts / type.js).`);
    process.exit(0);
}

if(flags.brief)
{
    for(const i of items)
    {
        const desc = i.descendants.length ? ` children: ${i.descendants.join(' ; ')}` : '';
        const ins = [...i.relations.inputs, ...i.relations.dynamicInputs.map(d => `[${d}]`)];
        const outs = [...i.relations.outputs.map(o => o.name), ...i.relations.dynamicOutputs.map(d => `[${d}]`)];
        const rel = ins.length || outs.length ? ` in: ${ins.join(',') || '-'} out: ${outs.join(',') || '-'}` : '';

        console.log(`${i.package}/${i.name} (${i.kind})${desc}${rel}`);
    }

    process.exit(0);
}

for(const i of items)
{
    console.log(`## ${i.package} / ${i.name}`);
    console.log(`- kind: ${i.kind}`);
    console.log(`- folder: ${i.dir}`);

    for(const iface of i.options)
    {
        console.log(`- options \`${iface.name}\`${iface.extends ? ` extends ${iface.extends}` : ''}:`);

        for(const p of iface.props)
        {
            console.log(`  - \`${p.name}${p.optional ? '?' : ''}: ${p.type}\`${p.doc ? ` — ${p.doc}` : ''}`);
        }
    }

    if(i.descendants.length) console.log(`- descendants (@DescendantsGetter): \`${i.descendants.join('` ; `')}\``);
    if(i.addDescendant) console.log(`- addDescendant (editor): \`${i.addDescendant}\``);
    if(i.renderedOptions.length) console.log(`- template renders: ${i.renderedOptions.map(r => `\`${r}\``).join(', ')}`);
    if(i.scoped) console.log('- scoped: true (creates own relations scope, set `scope` on it and its descendants)');
    if(i.childExtensions.length) console.log(`- childExtensions: ${i.childExtensions.join(', ')} (their options go into options of each CHILD)`);
    if(i.extensions.length) console.log(`- extensions: ${i.extensions.join(', ')}`);

    const r = i.relations;

    if(r.inputs.length || r.outputs.length || r.dynamicInputs.length || r.dynamicOutputs.length)
    {
        console.log(`- relations inputs: ${r.inputs.map(x => `\`${x}\``).join(', ') || '-'}${r.dynamicInputs.length ? ` + dynamic (${r.dynamicInputs.join(', ')})` : ''}`);
        console.log(`- relations outputs: ${r.outputs.map(o => `\`${o.name}\`${o.options ? ` (${o.options})` : ''}`).join(', ') || '-'}${r.dynamicOutputs.length ? ` + dynamic (${r.dynamicOutputs.join(', ')})` : ''}`);
    }

    if(i.layoutDefaults) console.log(`- default options (layout editor): \`${i.layoutDefaults}\``);
    if(i.relationsDefaults) console.log(`- default relationsOptions (relations editor): \`${i.relationsDefaults}\``);

    console.log('');
}
