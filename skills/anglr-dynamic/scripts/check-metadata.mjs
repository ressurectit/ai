#!/usr/bin/env node
// Validates hand-written @anglr/dynamic metadata (layout JSON and/or relations JSON).
//
// Usage:
//   node check-metadata.mjs --layout layout.json --relations relations.json [--items <root>]... [--layout more.json]...
//
//   --layout <file>     LayoutComponentMetadata JSON (root node); repeatable (e.g. custom component layouts)
//   --relations <file>  RelationsComponentMetadata[] / RelationsNodeMetadata[] JSON
//   --items <root>      folder scanned by dynamic-items.mjs (node_modules/@anglr/dynamic, own package folder);
//                       repeatable; enables package/name, options and relations endpoint checks
//
// Exit code 1 when errors are found. Files must be plain JSON (dump TS constants with JSON.stringify first).

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const args = process.argv.slice(2);
const layoutFiles = [];
const relationsFiles = [];
const itemRoots = [];

for(let i = 0; i < args.length; i++)
{
    switch(args[i])
    {
        case '--layout': layoutFiles.push(args[++i]); break;
        case '--relations': relationsFiles.push(args[++i]); break;
        case '--items': itemRoots.push(args[++i]); break;
        case '-h':
        case '--help':
            console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 13).map(l => l.replace(/^\/\/ ?/, '')).join('\n'));
            process.exit(0);
        default:
            console.error(`Unknown argument ${args[i]}`);
            process.exit(2);
    }
}

if(!layoutFiles.length && !relationsFiles.length)
{
    console.error('Nothing to check, pass --layout and/or --relations');
    process.exit(2);
}

const errors = [];
const warnings = [];
const err = m => errors.push(m);
const warn = m => warnings.push(m);

function load(file)
{
    try
    {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch(e)
    {
        err(`${file}: cannot parse JSON (${e.message})`);

        return null;
    }
}

//######################### item catalog #########################

/** key package/name -> item info from dynamic-items.mjs */
const catalog = new Map();
const VIRTUAL_PACKAGES = new Set(['layout-components', 'static-components', 'custom-components', 'custom-relations']);

if(itemRoots.length)
{
    const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dynamic-items.mjs');

    for(const root of itemRoots)
    {
        const json = execFileSync(process.execPath, [script, root, '--json'], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});

        for(const item of JSON.parse(json))
        {
            for(const pkg of item.package.split('|'))
            {
                catalog.set(`${pkg}/${item.name}`, item);
            }
        }
    }
}

function catalogItem(pkg, name)
{
    if(!catalog.size) return undefined;

    const item = catalog.get(`${pkg}/${name}`);

    if(item) return item;

    //custom components / relations: any name is served by customComponent / customRelation item
    if(pkg === 'custom-components') return catalog.get('custom-components/customComponent') ?? null;
    if(pkg === 'custom-relations') return catalog.get('custom-relations/customRelation') ?? catalog.get('custom-components/customRelation') ?? null;

    return null;
}

//######################### layout #########################

const isMeta = v => v && typeof v === 'object' && !Array.isArray(v) && typeof v.id === 'string' && typeof v.package === 'string' && typeof v.name === 'string';

/** id -> {node, path, parent} of all layout nodes */
const layoutNodes = new Map();

/** Finds child metadata nodes anywhere inside options (children, content, template, areas, tabs[].content, ...) */
function findChildren(value, pathSoFar, acc)
{
    if(Array.isArray(value))
    {
        value.forEach((v, i) => findChildren(v, `${pathSoFar}[${i}]`, acc));

        return acc;
    }

    if(value && typeof value === 'object')
    {
        if(isMeta(value))
        {
            acc.push({node: value, path: pathSoFar});

            return acc;
        }

        for(const [k, v] of Object.entries(value))
        {
            //contentOptions of custom component are keyed by inner ids, their values are options, not metadata
            if(k === 'contentOptions') continue;

            findChildren(v, `${pathSoFar}.${k}`, acc);
        }
    }

    return acc;
}

function walkLayout(node, where, parent, file)
{
    if(!isMeta(node))
    {
        err(`${file}: ${where} is not layout metadata (needs string id, package, name)`);

        return;
    }

    if(layoutNodes.has(node.id))
    {
        err(`${file}: duplicate layout id '${node.id}' (${where} and ${layoutNodes.get(node.id).path})`);
    }

    layoutNodes.set(node.id, {node, path: where, parent, file});

    if(!('options' in node) || node.options == null || typeof node.options !== 'object')
    {
        warn(`${file}: '${node.id}' has no options object; always store options (at least {}), extensions are initialized from it`);
    }

    if(VIRTUAL_PACKAGES.has(node.package) && node.package !== 'custom-components')
    {
        err(`${file}: '${node.id}' uses package '${node.package}' in layout; that package name is only valid in relations metadata`);
    }

    const item = catalogItem(node.package, node.name);

    if(item === null)
    {
        err(`${file}: '${node.id}' references unknown item ${node.package}/${node.name}`);
    }
    else if(item && !/layout/.test(item.kind))
    {
        err(`${file}: '${node.id}' ${node.package}/${node.name} is ${item.kind}, not a layout component`);
    }
    else if(item && node.options && typeof node.options === 'object')
    {
        const known = new Set(['cssClass', 'margin', 'padding', 'textStyling']);

        for(const iface of item.options) for(const p of iface.props) known.add(p.name);

        const parentItem = parent ? catalogItem(parent.package, parent.name) : null;

        for(const iface of parentItem?.options ?? [])
        {
            if(/Extension(s)?Options$/.test(iface.name)) for(const p of iface.props) known.add(p.name);
        }

        const extendsSomething = item.options.some(o => o.extends);

        if(!extendsSomething)
        {
            for(const key of Object.keys(node.options))
            {
                if(!known.has(key))
                {
                    warn(`${file}: '${node.id}' option '${key}' is not declared by ${node.package}/${node.name} options (or styling / parent child extension); check spelling`);
                }
            }
        }

        if(item.descendants.length)
        {
            const childKeys = findChildren(node.options, 'options', []).map(c => c.path.split(/[.[]/)[1]);

            for(const key of new Set(childKeys))
            {
                if(!item.descendants.some(d => d.includes(key)))
                {
                    warn(`${file}: '${node.id}' has child metadata under options.${key}, but descendants getter of ${node.package}/${node.name} is \`${item.descendants[0]}\``);
                }
            }
        }
        else
        {
            const nested = findChildren(node.options, 'options', []);

            if(nested.length && node.package !== 'custom-components')
            {
                warn(`${file}: '${node.id}' (${node.package}/${node.name}) has no descendants getter, nested metadata at ${nested[0].path} will not be rendered/edited as child`);
            }
        }
    }

    for(const child of findChildren(node.options ?? {}, `${where}.options`, []))
    {
        walkLayout(child.node, child.path, node, file);
    }
}

for(const file of layoutFiles)
{
    const layout = load(file);

    if(layout) walkLayout(layout, 'root', null, file);
}

//######################### relations #########################

for(const file of relationsFiles)
{
    const relations = load(file);

    if(!relations) continue;

    if(!Array.isArray(relations))
    {
        err(`${file}: relations metadata must be an array`);
        continue;
    }

    const byId = new Map();

    for(const [index, r] of relations.entries())
    {
        const where = `${file}[${index}]`;

        if(!r || typeof r.id !== 'string' || typeof r.package !== 'string' || typeof r.name !== 'string')
        {
            err(`${where}: needs string id, package, name`);
            continue;
        }

        if(byId.has(r.id)) err(`${where}: duplicate relations id '${r.id}'`);

        byId.set(r.id, r);

        if(!('relationsOptions' in r)) warn(`${where} '${r.id}': missing relationsOptions (use null when node has no options)`);

        if(!Array.isArray(r.outputs))
        {
            err(`${where} '${r.id}': missing outputs array; runtime skips entries without 'outputs' (no options, no initial transfer, pure node never created). Use outputs: []`);
        }

        if(r.package === 'layout-components' || r.package === 'static-components')
        {
            if(r.name !== r.id) err(`${where}: ${r.package} entry must have name === id ('${r.name}' vs '${r.id}')`);
        }

        if(r.package === 'layout-components' && layoutNodes.size && !layoutNodes.has(r.id))
        {
            err(`${where}: layout-components entry '${r.id}' has no layout component with this id`);
        }

        if(r.package !== 'layout-components' && layoutNodes.has(r.id))
        {
            warn(`${where}: '${r.id}' equals a layout id but package is '${r.package}'; layout components are referenced with package 'layout-components'`);
        }

        if(r.package === 'custom-relations' && r.relationsOptions && r.relationsOptions.id !== r.id)
        {
            warn(`${where}: custom relation relationsOptions.id should equal node id '${r.id}'`);
        }
    }

    /** relations item info for node */
    const infoFor = (r) =>
    {
        if(r.package === 'layout-components')
        {
            const l = layoutNodes.get(r.id);

            return l ? catalogItem(l.node.package, l.node.name) : undefined;
        }

        if(r.package === 'static-components') return undefined;

        return catalogItem(r.package, r.name);
    };

    const hasDynamic = (info, kind) => info && (kind === 'in' ? info.relations.dynamicInputs.length : info.relations.dynamicOutputs.length);

    for(const r of byId.values())
    {
        const info = infoFor(r);

        if(info === null && r.package !== 'layout-components')
        {
            err(`relations '${r.id}': unknown relations item ${r.package}/${r.name}`);
        }

        if(info && r.package === 'layout-components' && !/relations/.test(info.kind))
        {
            err(`relations '${r.id}': layout item ${info.package}/${info.name} is not a relations component (no RelationsRegistrationExtension), it cannot send or receive data`);
        }

        if(info && r.package !== 'layout-components' && !/relations/.test(info.kind))
        {
            err(`relations '${r.id}': ${r.package}/${r.name} is ${info.kind}; only pure relations nodes are created from relations metadata`);
        }

        for(const out of r.outputs ?? [])
        {
            if(info && !hasDynamic(info, 'out') && !info.relations.outputs.some(o => o.name === out.outputName))
            {
                err(`relations '${r.id}': unknown output '${out.outputName}' (known: ${info.relations.outputs.map(o => o.name).join(', ') || 'none'})`);
            }

            for(const input of out.inputs ?? [])
            {
                const target = byId.get(input.id);

                if(!target)
                {
                    err(`relations '${r.id}'.${out.outputName} -> '${input.id}': target has no own relations entry (add one with outputs: [])`);
                    continue;
                }

                const tInfo = infoFor(target);

                if(tInfo && !hasDynamic(tInfo, 'in') && !tInfo.relations.inputs.includes(input.inputName))
                {
                    err(`relations '${r.id}'.${out.outputName} -> '${input.id}'.${input.inputName}: unknown input (known: ${tInfo.relations.inputs.join(', ') || 'none'})`);
                }
            }
        }
    }
}

//######################### report #########################

for(const w of warnings) console.log(`WARN  ${w}`);
for(const e of errors) console.log(`ERROR ${e}`);

console.log(`\n${layoutNodes.size} layout nodes, ${errors.length} errors, ${warnings.length} warnings${catalog.size ? `, ${catalog.size} catalog items` : ' (no --items, endpoint checks skipped)'}`);

process.exit(errors.length ? 1 : 0);
