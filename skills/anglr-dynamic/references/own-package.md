# Own items and packages

How to create layout components, layout + relations components and pure relations nodes, with
editor metadata, and register them as a package (same mechanism as the built-in packages).

## Contents

1. Loading pipeline
2. Package layout and naming
3. Layout component
4. Container component (children)
5. Layout + relations component
6. Pure relations node
7. Relations editor node component
8. Extensions
9. Package providers and feature
10. Pitfalls

## 1. Loading pipeline

`DynamicItemLoader` loads an item for `{package, name}`: asks registered `DynamicModuleProvider`s
(`tryToGet(source)`, first non-null ES module wins) → runs `DynamicModuleDataExtractor`s over the
module (`default`, `extensions`, `childExtensions`, `relations` exports; built-in fns
`defaultExportExtractor`, `extensionsExportsExtractor`, `relationsExportExtractor`) → validates → caches.

| Loader token | Providers (multi) | Extractors (multi) | Used by |
| --- | --- | --- | --- |
| `LAYOUT_COMPONENTS_LOADER` | `LAYOUT_COMPONENTS_MODULE_PROVIDERS` | `LAYOUT_COMPONENTS_MODULE_DATA_EXTRACTORS` | layout renderer |
| `LAYOUT_MODULE_TYPES_LOADER` | `LAYOUT_MODULE_TYPES_PROVIDERS` | `LAYOUT_MODULE_TYPES_DATA_EXTRACTORS` | layout palette (`types.ts`) |
| `RELATIONS_COMPONENTS_LOADER` | `RELATIONS_COMPONENTS_MODULE_PROVIDERS` | `RELATIONS_COMPONENTS_MODULE_DATA_EXTRACTORS` | relations runtime (pure nodes) |
| `RELATIONS_MODULE_TYPES_LOADER` | `RELATIONS_MODULE_TYPES_PROVIDERS` | `RELATIONS_MODULE_TYPES_DATA_EXTRACTORS` | relations palette (`relations.ts`) |
| `RELATIONS_NODES_LOADER` | `RELATIONS_NODES_PROVIDERS` | `RELATIONS_NODES_DATA_EXTRACTORS` | relations editor nodes |

## 2. Package layout and naming

```text
myComponents/
  dynamicItems/<name>/
    <name>.options.ts                 <Name>ComponentOptions | <Name>RelationsOptions
    <name>.component.ts|.html         layout component (extends LayoutComponentBase)
    <name>.relations.ts               pure relations node (@PureRelationsComponent)
    <name>.metadata.ts                lazy loaders of editor metadata (DynamicMetadataLoader)
    metadata/<name>.layoutMetadata.ts LayoutEditorMetadataDescriptor
    metadata/<name>.model.ts          properties editor model (@LayoutProperty*)
    metadata/<name>.relationsMetadata.ts RelationsEditorMetadataDescriptor
    node/<name>Node.component.ts|.html relations editor node (extends RelationsNodeBase)
    type.ts                           default export + extensions / childExtensions
  services/                           3 DynamicModuleProviders (items, types, relations)
  types.ts                            default export: layout component names (layout palette)
  relations.ts                        default export: pure node names (relations palette)
  features.ts                         with<Package>(): DynamicFeature
  index.ts                            options interfaces + feature
```

Folder name = item `name`. Layout + relations components belong to `types.ts` only — in the
relations editor they appear as `layout-components` nodes. `scripts/dynamic-items.mjs <myComponents>`
then lists the package like the built-in ones (package name detected from the providers).

## 3. Layout component

```ts
import {Component, ChangeDetectionStrategy} from '@angular/core';
import {HostDisplayBlockStyle} from '@anglr/common';
import {LayoutComponent, LayoutComponentBase} from '@anglr/dynamic/layout';
import {LayoutEditorMetadata} from '@anglr/dynamic/layout-editor';

import {BadgeComponentOptions} from './badge.options';          // {text: string|undefined|null; color: string|undefined|null;}
import {BadgeLayoutMetadataLoader} from './badge.metadata';

@Component(
{
    selector: 'badge',
    template: '<span [style.background-color]="options?.color">{{options?.text}}</span>',
    styles: [HostDisplayBlockStyle],
    changeDetection: ChangeDetectionStrategy.OnPush
})
@LayoutEditorMetadata(BadgeLayoutMetadataLoader)
export class BadgeComponent extends LayoutComponentBase<BadgeComponentOptions> implements LayoutComponent<BadgeComponentOptions>
{
}
```

`options` are not Angular inputs: the renderer sets them and calls dynamic lifecycle methods. Hooks
of `LayoutComponentBase<TOptions>`:

| Hook | Called |
| --- | --- |
| `onInit()` | once |
| `onOptionsSet()` | after `onInit()` and after every options change |
| `afterInit()` | after extensions are initialized |
| `onOptionsChange()` | every options change except the first |
| `onChanges(changes)` | non-options changes — relations inputs arrive here |
| `onDestroy()` | on destroy |

Protected members: `options`, `optionsSafe` (throws if missing), `element`, `componentElement`,
`extensionsOptions`, `changeDetector`, `injector`, `logger`. `invalidateVisuals()` runs change
detection — rendered components are detached, call it after own state changes. Lifecycle interfaces
`DynamicOnInit`, `DynamicOnChanges`, `DynamicAfterViewInit`; contract `LayoutComponent`/`DynamicItem`.

`badge.metadata.ts` (editor metadata is a separate lazy chunk):

```ts
export const BadgeLayoutMetadataLoader: DynamicMetadataLoader<LayoutEditorMetadataDescriptor<BadgeComponentOptions>> = async () => new (await import('./metadata/badge.layoutMetadata')).BadgeLayoutEditorMetadata();
```

`metadata/badge.layoutMetadata.ts` (properties editor details in `editors.md`):

```ts
export class BadgeLayoutEditorMetadata implements LayoutEditorMetadataDescriptor<BadgeComponentOptions>
{
    public metaInfo?: LayoutEditorMetadataInfo<BadgeComponentOptions> =
    {
        name: 'Badge',
        description: 'Colored badge with text',
        group: 'My components',
        optionsMetadata:
        {
            propertiesMetadata:
            [
                {
                    modelType: ComponentStylingModel,
                    propertiesControls: [getPropertiesControl(ComponentStylingPropertiesControlComponent)],
                },
                {
                    modelType: BadgeModel,
                    propertiesControls: [genericPropertiesControlFor<BadgeModel>(['text', 'color'])],
                },
            ],
        },
        defaultOptions: {text: 'New', color: '#2e7d32'},
    };

    constructor()
    {
        Object.freeze(this);
    }
}
```

`type.ts`:

```ts
import {ComponentStylingExtension} from '@anglr/dynamic/layout';
import {BadgeComponent} from './badge.component';

export default BadgeComponent;

export const extensions = [ComponentStylingExtension];
```

`LayoutEditorMetadataInfo`: `name`, `description`, `group` (palette), `dragDisabled`, `scoped`,
`optionsMetadata` (`propertiesMetadata`, `childPropertiesMetadata`, `propertyTypeControlOverride`),
`defaultOptions`. `@LayoutEditorDesignerType(loader)` renders a different component for the item inside
the layout editor (`LayoutEditorDesignerTypeType`); `layoutDesignerTypeExtractor` reads it.

## 4. Container component (children)

Declare where children live with `@DescendantsGetter` and how the editor adds/removes them:

```ts
@Component(
{
    selector: 'info-card',
    template: `<h3>{{options?.title}}</h3>
               <div class="info-card-content"><ng-container *layoutComponentRenderer="options?.content"/></div>`,
    imports: [LayoutComponentRendererDirective],
    changeDetection: ChangeDetectionStrategy.OnPush
})
@DescendantsGetter<InfoCardComponentOptions>(options => options?.content ? [options.content] : [])
@LayoutEditorMetadata(InfoCardLayoutMetadataLoader)
export class InfoCardComponent extends LayoutComponentBase<InfoCardComponentOptions> implements LayoutComponent<InfoCardComponentOptions>
{
}
```

In `InfoCardLayoutEditorMetadata` (besides `metaInfo`):

```ts
public addDescendant?: Action<[LayoutComponentMetadata, InfoCardComponentOptions, number]> = (metadata, options) => options.content = metadata;
public removeDescendant?: Action<[string, InfoCardComponentOptions]> = (_id, options) => options.content = null;
public canDropMetadata?: Func<boolean, [InfoCardComponentOptions|undefined|null]> = options => !options?.content;
public getChildrenContainer?: Func<Element|null, [Element]> = element => element.querySelector('.info-card-content');
```

For arrays use `options.children ??= []; options.children.splice(index, 0, metadata);` and
`isHorizontalDrop` when children flow horizontally. `customDragType()` / `customDropTypes()` restrict
which items can be dropped where (`{tree, layout}` drag type names). Keep `getDescendantsGetter(type)`
in mind: it returns the getter of any component type at runtime.

Model properties for child content (`content`) get no `@LayoutPropertyType` (not edited as a value).

## 5. Layout + relations component

```ts
@Component({selector: 'counter', templateUrl: 'counter.component.html', changeDetection: ChangeDetectionStrategy.OnPush})
@RelationsEditorMetadata(CounterRelationsMetadataLoader)
@LayoutEditorMetadata(CounterLayoutMetadataLoader)
export class CounterComponent extends LayoutComponentBase<CounterComponentOptions> implements LayoutComponent<CounterComponentOptions>, RelationsComponent
{
    public relationsOptions: unknown;

    /** Input set by relations */
    @Input()
    public value: number|undefined|null;

    /** Output transferred by relations */
    @DynamicOutput()
    public count: number = 0;

    protected increment(): void
    {
        this.count += this.options?.step ?? 1;
        this.invalidateVisuals();
    }

    protected override onChanges(changes: SimpleChanges): void
    {
        if(nameof<CounterComponent>('value') in changes)
        {
            this.count = this.value ?? 0;
        }
    }
}
```

`type.ts` must add `RelationsRegistrationExtension` (registers the instance under its layout id):

```ts
export default CounterComponent;
export const extensions = [ComponentStylingExtension, RelationsRegistrationExtension];
```

`@Input()` is optional documentation — relations assign the property directly. Never put
`@PureRelationsComponent()` on a layout component. `@DebugData({inputs, outputs})` lists endpoints for
the relations debugger. Relations metadata: `{id: <layoutId>, package: 'layout-components', name: <layoutId>, …}`.

## 6. Pure relations node

```ts
@PureRelationsComponent()
@RelationsEditorMetadata(ConcatRelationsMetadataLoader)
export class ConcatRelations implements RelationsComponent<ConcatRelationsOptions>
{
    protected logger: Logger;

    public relationsOptions: ConcatRelationsOptions|undefined|null;   // {separator}

    public first: unknown;
    public second: unknown;

    @DynamicOutput()
    public result: string|undefined|null;

    constructor(injector: Injector)          // created as new Type(injector) – no inject()
    {
        this.logger = injector.get(LOGGER);
    }

    public dynamicOnChanges(changes: SimpleChanges): void
    {
        if(nameof<ConcatRelations>('first') in changes || nameof<ConcatRelations>('second') in changes)
        {
            this.result = [this.first, this.second].filter(itm => itm != null && itm !== '').join(this.relationsOptions?.separator ?? ' ');
        }
    }

    public invalidateVisuals(): void
    {
    }

    public relationsOnDestroy(): void
    {
    }
}
```

`type.ts`: `export default ConcatRelations;`. Optional `relationsOnDestroy()` (`RelationsOnDestroy`).
Dynamic endpoints: define properties in the `relationsOptions` setter with `Object.defineProperty`
(outputs also need a `<name>Change` Subject and `defineAssignedProp(this, name)` on set, optionally
`defineSkipInitProp`) — see `trigger`/`merge` sources. `isAssigned`, `isSkipInit` read those markers;
`isRelationsComponentType`/`isRelationsComponentDef` are type guards; `RelationsComponentType` is the
`new(injector)` constructor type.

`metadata/concat.relationsMetadata.ts`:

```ts
export class ConcatRelationsEditorMetadata implements RelationsEditorMetadataDescriptor<ConcatRelationsOptions>
{
    public metaInfo?: RelationsEditorMetadataInfo<ConcatRelationsOptions> =
    {
        name: 'Concat',
        description: 'Joins two texts using separator',
        group: 'My components',
        defaultOptions: {separator: ' '},          // relationsOptions of a dropped node
    };

    public nodeDefinition: Type<RelationsNode<ConcatRelationsOptions>> = ConcatNodeComponent;

    constructor()
    {
        Object.freeze(this);
    }
}
```

## 7. Relations editor node component

```ts
@Component(
{
    selector: 'concat-node',
    templateUrl: 'concatNode.component.html',
    imports: [RelationsNodeHeaderComponent, RelationNodeInputComponent, RelationNodeOutputComponent],
})
export class ConcatNodeComponent extends RelationsNodeBase<ConcatRelationsOptions> implements RelationsNode<ConcatRelationsOptions>
{
}
```

```html
<relations-node-header [parent]="this" [destroySubject]="destroySubject"/>

<div class="node-content">
    <div class="inputs-outputs">
        <div class="inputs">
            <div class="input">
                <relation-node-input [parentCoordiantes]="nodePosition" [zoomLevel]="zoomLevel" name="first" [parent]="this"/>
                <div>First</div>
            </div>
        </div>

        <div class="outputs">
            <div class="output">
                <div>Result</div>
                <relation-node-output [parentCoordiantes]="nodePosition" [zoomLevel]="zoomLevel" name="result" [parent]="this"/>
            </div>
        </div>
    </div>
</div>
```

`name` must equal the runtime property (`[parentCoordiantes]` is the real, misspelled input name).
Node options editing: `RelationsNodeBase` exposes `metadata` (`RelationsNodeMetadata`), `history`
and change hooks (`metadataSet()`); write into `metadata.relationsOptions` then call
`this.history.getNewState()` (see built-in `transformData`/`state` nodes). `RelationsNodeHeaderComponent`
shows name/scope and opens `RelationsNodePropertiesEditorComponent` (display name, scope).

## 8. Extensions

```ts
export class HighlightExtension extends DynamicItemExtensionBase<HighlightOptions> implements DynamicItemExtension<HighlightOptions>
{
    protected override onInit(): void { this.apply(); }
    protected override onOptionsChange(): void { this.apply(); }

    protected apply(): void
    {
        this.element?.nativeElement.classList.toggle('highlight', !!this.options?.highlight);
    }
}
```

Base fields: `injector`, `element`, `options`, `instance`, `metadata`; hooks `onInit`, `onOptionsChange`,
`onDestroy`. Attach via `export const extensions = [...]` (item itself) or
`export const childExtensions = [...]` (every child rendered by this container — options are read from
the child's `options`, editable through `metaInfo.optionsMetadata.childPropertiesMetadata`).
`DynamicItemExtensionType`/`DynamicItemExtensions` type the exports.

## 9. Package providers and feature

Items provider (an explicit map keeps every item a separate lazy chunk):

```ts
const items: Record<string, () => Promise<DynamicModule>> =
{
    badge: () => import('../dynamicItems/badge/type'),
    concat: () => import('../dynamicItems/concat/type'),
};

@Injectable()
export class MyDynamicModuleItemsProvider implements DynamicModuleProvider
{
    public async tryToGet(source: DynamicItemSource): Promise<DynamicModule|null>
    {
        if(source.package != 'my-components')
        {
            return null;
        }

        return await items[source.name]?.() ?? null;
    }
}
```

Types and relations providers return `import('../types')` / `import('../relations')` for the package.

```ts
export function withMyComponents(): DynamicFeature
{
    return new DynamicFeature(
    {
        layoutRuntime: {prependProviders: [], providers: [<ClassProvider>{provide: LAYOUT_COMPONENTS_MODULE_PROVIDERS, useClass: MyDynamicModuleItemsProvider, multi: true}]},
        layoutEditor: {prependProviders: [], providers: [<ClassProvider>{provide: LAYOUT_MODULE_TYPES_PROVIDERS, useClass: MyDynamicModuleTypesProvider, multi: true}, provideStaticPackageSource('my-components')]},
        relationsRuntime: {prependProviders: [], providers: [<ClassProvider>{provide: RELATIONS_COMPONENTS_MODULE_PROVIDERS, useClass: MyDynamicModuleItemsProvider, multi: true}]},
        relationsEditor:
        {
            prependProviders: [],
            providers:
            [
                <ClassProvider>{provide: RELATIONS_MODULE_TYPES_PROVIDERS, useClass: MyDynamicModuleRelationsProvider, multi: true},
                <ClassProvider>{provide: RELATIONS_NODES_PROVIDERS, useClass: MyDynamicModuleItemsProvider, multi: true},
                provideStaticPackageSource('my-components'),
            ],
        },
    });
}
```

Use: `provideDynamic(withLayoutRelationsRuntime(), withBasicComponents(), withMyComponents())`.
Built-in provider classes follow the same pattern (`BasicDynamicModuleItemsProvider`,
`…TypesProvider`, `…RelationsProvider` for each package — `api-index-packages.md`).

## 10. Pitfalls

- `useDefineForClassFields: false` is required, otherwise class fields shadow `@DynamicOutput()` accessors and nothing transfers.
- Relations inputs/outputs are plain properties, not signals; emit new instances for objects/arrays.
- Pure nodes: constructor `(injector: Injector)`, `inject()` is not available.
- Forgetting `RelationsRegistrationExtension` in `type.ts` → the component silently doesn't take part in relations.
- Forgetting `provideStaticPackageSource()` → package not offered in editors' package manager.
- Editor metadata loaders must use dynamic `import()` so runtime bundles don't include editor code.
