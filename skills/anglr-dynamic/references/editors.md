# Editors: layout editor, relations editor, properties editor

## Contents

1. Layout editor
2. Relations editor
3. History, hotkeys, saving
4. Package manager and palette
5. Properties editor: model and decorators
6. Property types and properties controls
7. Custom properties control / property type
7a. Overriding properties controls
8. Defaults override
9. Custom components and custom relations in editors
10. Static components in the relations editor
11. Code editor
12. Relations debugger (experimental)

## 1. Layout editor

`<layout-editor>` (`LayoutEditorComponent`, scope `provideDynamic(withLayoutEditor(), …)`): component
tree, palette (search + package manager), canvas, properties editor. Needs the application providers
from `setup.md` → 3 and library CSS.

| Input | Type | Description |
| --- | --- | --- |
| `metadata` | `LayoutComponentMetadata \| null` | root of edited layout; setting it resets history |
| `packages` | `string[] \| null` | packages in palette; hides package manager UI |
| `whiteList` / `blackList` | `DynamicItemSource[] \| null` | show only / hide items |

```ts
@Component(
{
    selector: 'page-designer',
    template: `<button type="button" class="btn btn-primary" (click)="save()">Save{{history.saved ? '' : ' *'}}</button>
               <layout-editor class="flex-1" [metadata]="metadata"/>`,
    host: {class: 'flex-column', style: 'height: 80vh'},
    imports: [LayoutEditorComponent],
    providers: [provideDynamic(withLayoutEditor(), withPackageManager('LAYOUT_EDITOR_PACKAGES'), withEditorHotkeys(), withBasicComponents())],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageDesignerComponent
{
    protected metadataManager: EditorMetadataManager<LayoutComponentMetadata> = inject(EDITOR_METADATA_MANAGER);
    protected history = inject(LAYOUT_HISTORY_MANAGER);
    protected metadata: LayoutComponentMetadata = {id: `stackPanel-${generateId(10)}`, displayName: 'root', package: 'basic-components', name: 'stackPanel', options: {children: []}};

    constructor()
    {
        const changeDetector = inject(ChangeDetectorRef);

        this.history.historyChange.pipe(takeUntilDestroyed()).subscribe(() => changeDetector.markForCheck());
        inject(EditorHotkeys).save.pipe(takeUntilDestroyed()).subscribe(() => this.save());
    }

    protected save(): void
    {
        const metadata = this.metadataManager.getMetadata();   // store it (JSON)

        this.history.save();
    }
}
```

The editor has no save output: read `EDITOR_METADATA_MANAGER.getMetadata()`. Inside the editor
`LayoutEditorMetadataManager` tracks selected/highlighted components, `LayoutEditorRenderer`
(subclass of `LayoutRenderer`) renders designer wrappers (`LayoutDesignerLayoutComponent`,
`LayoutDesignerDirective` & helper directives), `PlaceholderRenderer`/`DndBusService`/`DragActiveService`/`LiveEventService`
drive drag & drop. These are internals; `api-index-core.md` lists them.

## 2. Relations editor

`<relations-editor>` (`RelationsEditorComponent`), scope `withRelationsEditor()` or
`withLayoutRelationsEditor()`, **always with `withPackageManager()`**. Inputs `metadata: RelationsNodeMetadata[]`,
`packages`, `whiteList`, `blackList` (same meaning as layout editor). Result:
`EDITOR_METADATA_MANAGER.getMetadata()`; history `RELATIONS_HISTORY_MANAGER`.

```ts
providers: [provideDynamic(withLayoutRelationsEditor(), withPackageManager('RELATIONS_EDITOR_PACKAGES'), withBasicComponents())]

constructor()
{
    inject(LayoutManager).setLayout(pageLayout);   // relations-capable components of this layout become nodes
}
```

Template: `<relations-editor class="flex-1" [metadata]="relations"/>`. Internals: `RelationsCanvasComponent`
(zoom/pan canvas, `MouseButton`, `clamp`), `NodesPaletteComponent`, `RelationsNodeManager`,
`RelationsNodeRendererDirective`, `NodeRelationPath`, `ScopeRegister` (scopes offered in node properties;
`layout-relations` provides one reading scopes from the layout), `LayoutComponentsRegister` /
`LayoutComponentsRelationsNodesProvider` / `LayoutComponentsRelationsTypesProvider` (layout components as
nodes), `ComponentEndpointModel`, `ConfigureNodeEndpointComponent` (dialog naming dynamic endpoints),
`GetModelPipe`, `PropertiesMetadataPipe`, `PropertySelectedPipe`, `ToRelationsDragDataPipe`.

## 3. History, hotkeys, saving

`MetadataHistoryManager<TMetadata>` (`LAYOUT_HISTORY_MANAGER`, `RELATIONS_HISTORY_MANAGER`): `undo()`,
`redo()`, `canUndo`, `canRedo`, `save()` (marks saved), `saved`, `historyChange`, `pop`, `state`,
`getNewState()` (record current state after a manual change), `setInitialState()`, `clean()`,
`enable()`/`disable()`. `withEditorHotkeys()` → `EditorHotkeys` observables `save`, `undo`, `redo`,
`copy`, `cut`, `paste`, `delete` (editor handles all but `save` itself).

## 4. Package manager and palette

`PackageManager` (`packages`, `usedPackages` signals, `setUsedPackages()`, `refresh()`) combines
`PackageSource`s (`PACKAGE_SOURCES` multi; `{packages, packagesChange, refresh()}`;
`provideStaticPackageSource('name')`). `withPackageManager('STORAGE')` persists the selection,
`withPackageManager(MyPackageManager)` or `withPackageManager(factoryFn(() => …))` customizes it.
UI: `PackageManagerComponent` / `PackageManagerModule`. Palettes: `ComponentsPaletteComponent`
(`ComponentsPaletteItem`), `NodesPaletteComponent` (`NodesPaletteItem`); refresh them by emitting on
`REFRESH_PALETTE_OBSERVABLES` (layout-editor and relations-editor each export their own token).

## 5. Properties editor: model and decorators

`metaInfo.optionsMetadata.propertiesMetadata` lists blocks `{modelType, propertiesControls}`.
The model is a class implementing the options interface with a `(value)` constructor:

```ts
export class CounterModel implements CounterComponentOptions
{
    @LayoutPropertyName('Label')
    @LayoutPropertyDescription('Label displayed next to count')
    @LayoutPropertyType<DefaultKnownPropertyTypes>('inputString')
    public label: string|undefined|null = null;

    @LayoutPropertyName('Size')
    @LayoutPropertyType<DefaultKnownPropertyTypes>('selectValue')
    @LayoutPropertyValues<string>(['small', 'large'])
    public size: string|undefined|null = null;

    constructor(value: CounterComponentOptions|undefined|null)
    {
        mapValuesToThis.bind(this)(value);
    }
}
```

| Decorator (`@anglr/dynamic/layout-editor`) | Purpose |
| --- | --- |
| `@LayoutPropertyName(name)` | label |
| `@LayoutPropertyDescription(text)` | tooltip |
| `@LayoutPropertyType<T>(type)` | property type → control; without it the generic control skips the property |
| `@LayoutPropertyValues<T>(values)` | values for `selectValue` |
| `@LayoutPropertyObject(type, metadataSymbols)` | nested object with own property metadata |

Data interfaces: `LayoutPropertyNameData`, `LayoutPropertyDescriptionData`, `LayoutPropertyTypeData`,
`LayoutPropertyValuesData`, `LayoutPropertyObjectData`; combined `LayoutEditorPropertyMetadata`;
`LayoutPropertyMetadata` holds the symbols; `LayoutEditorPropertyMetadataExtractor` reads them;
`LAYOUT_EDITOR_PROPERTY_METADATA_PROPERTIES` lists the symbols. `childPropertiesMetadata` edits
options read by child extensions. Model defaults are only editor defaults; new items get `metaInfo.defaultOptions`.

## 6. Property types and properties controls

Default `LAYOUT_EDITOR_PROPERTY_TYPE_CONTROLS`: `inputString` (`InputStringComponent`), `textarea`
(`TextareaComponent`), `inputNumber` (`InputNumberComponent`), `inputBoolean` (`InputBooleanComponent`),
`selectValue` (`SelectValueComponent`). `DefaultKnownPropertyTypes` also lists `inputSize` and
`selectValues`, but they are **not registered** by default — a property typed with them renders nothing
unless you add a control (`InputSizeComponent` exists and is used inside margin/padding controls; register
it as `inputSize` per section 7). `propertyTypeControlOverride` in `optionsMetadata` overrides per item.

Properties control getters (`propertiesControls`):

| Getter | Renders |
| --- | --- |
| `genericPropertiesControlFor<TModel>(['a', 'b'])` | listed properties by their type (`DefaultGenericPropertiesControlComponent`) |
| `getPropertiesControl(Type)` | any `PropertiesControl` component, e.g. `ComponentStylingPropertiesControlComponent` (CSS class, margin, padding — `textStyling` has no editor control; model `ComponentStylingModel`, `MarginModel`, `PaddingModel`, controls `MarginControlComponent`, `PaddingControlComponent`) |
| `codePropertiesControlFor<TModel>('prop', languageModel)` | one property in Monaco dialog (`BaseCodePropertiesControlComponent`) |

Built-in item controls: `ButtonPresetsPropertiesControlComponent` (`BUTTONS_PRESETS`),
`RowsColumnsPropertiesControlComponent` + `RowsColumnsModel` (gridPanel rows/columns, helpers
`toGridRowsTemplate`, `toGridColumnsTemplate`). Rendering: `PropertiesEditorComponent`,
`PropertiesControlRendererDirective`, `PropertyTypeControlRendererDirective`, modules
`PropertiesControlsModule`, `PropertyTypeControlsModule`; `LayoutPropertiesModelType`, `PropertiesControlGetter`.

Getters run in the **injection context** of the properties editor and resolve the component **through DI**:
the component type is the token, the provided value is the component type to render.
`genericPropertiesControlFor()` resolves `DefaultGenericPropertiesControlComponent`,
`codePropertiesControlFor()` resolves `BaseCodePropertiesControlComponent`, `getPropertiesControl(type)`
resolves `type` and falls back to `type` itself when nothing is provided. That makes every control
overridable (section 7a).

## 7. Custom properties control / property type

```ts
@Component(
{
    selector: 'color-properties-control',
    template: `@if(form)
               {
                   <div class="properties-form-group" [formGroup]="form">
                       <label class="properties-control-label">Color</label>
                       <input type="color" formControlName="color">
                   </div>
               }`,
    imports: [ReactiveFormsModule],
})
export class ColorPropertiesControlComponent extends PropertiesControlBase<BadgeComponentOptions> implements PropertiesControl<BadgeComponentOptions>
{
}
```

`PropertiesControlBase<TOptions>` gives `form` (FormGroup built from the model), `options`,
`propertiesMetadata`; values written to `form` apply to the component and history. Register with
`getPropertiesControl(ColorPropertiesControlComponent)` next to the generic control; leave the edited
property without `@LayoutPropertyType`.

Custom property type: component extending `PropertyTypeControlBase<TValue>` (`control: FormControl`,
`values`), then provide `LAYOUT_EDITOR_PROPERTY_TYPE_CONTROLS` with a dictionary containing the default
controls **plus** yours (the token isn't multi):

```ts
{provide: LAYOUT_EDITOR_PROPERTY_TYPE_CONTROLS, useValue: {inputString: InputStringComponent, textarea: TextareaComponent, inputNumber: InputNumberComponent, inputBoolean: InputBooleanComponent, selectValue: SelectValueComponent, color: ColorTypeControlComponent}}
```

## 7a. Overriding properties controls

Replace a control everywhere it's used without touching item metadata — a `ValueProvider` placed
**after** `provideDynamic()` in the same `providers` array (or in the `layoutEditor` providers of your own
`DynamicFeature`):

```ts
providers:
[
    provideDynamic(withLayoutEditor(), withBasicComponents()),
    //component type of built-in properties control is token, value is component type used instead
    <ValueProvider>
    {
        provide: ComponentStylingPropertiesControlComponent,
        useValue: StylingPropertiesControlComponent,
    },
],
```

- `withLayoutEditor()` provides `ComponentStylingPropertiesControlComponent`,
  `DefaultGenericPropertiesControlComponent` and `BaseCodePropertiesControlComponent` as tokens.
- `withBasicComponents()`, `withFormComponents()`, `withMaterialComponents()`, `withTinyMceComponents()`
  and `withCustomComponents()` provide their item-specific controls the same way; publicly exported
  (so overridable from outside) are `ButtonPresetsPropertiesControlComponent` and
  `RowsColumnsPropertiesControlComponent` (`@anglr/dynamic/basic-components`).
- Own controls registered with `getPropertiesControl(MyControlComponent)` are overridable the same way.

Replacement control reusing built-in margin/padding blocks (adapted from readme):

```ts
@Component(
{
    selector: 'styling-properties-control',
    template: `@if(form)
               {
                   <div class="properties-form-group" [formGroup]="form">
                       <label class="properties-control-label">Css class</label>
                       <select class="form-control" formControlName="cssClass">
                           @for(cssClass of cssClasses; track cssClass)
                           {
                               <option [value]="cssClass">{{cssClass || '(none)'}}</option>
                           }
                       </select>
                   </div>
               }
               <margin-control class="properties-form-group" [form]="form" [propertiesMetadata]="propertiesMetadata"/>
               <padding-control class="properties-form-group" [form]="form" [propertiesMetadata]="propertiesMetadata"/>`,
    imports: [ReactiveFormsModule, MarginControlComponent, PaddingControlComponent],
})
export class StylingPropertiesControlComponent extends PropertiesControlBase<ComponentStylingOptions> implements PropertiesControl<ComponentStylingOptions>
{
    protected cssClasses: string[] = ['', 'text-primary', 'text-success', 'text-danger', 'font-bold'];
}
```

`ComponentStylingOptions` comes from `@anglr/dynamic/layout`; the rest from `@anglr/dynamic/layout-editor`.

## 8. Defaults override

```ts
@Injectable()
export class MyDefaultsOverride extends DefaultsOverride
{
    public getOptions(packageName: string, name: string, defaultOptions: unknown): unknown
    {
        if(packageName == 'basic-components' && name == 'button')
        {
            return {...defaultOptions as ButtonComponentOptions, text: 'Submit', buttonCssClass: 'btn btn-success'};
        }

        return defaultOptions;
    }

    public getDisplayName(_packageName: string, name: string, displayName?: string): string
    {
        return displayName || `my ${name}`;
    }
}
```

Register with `withLayoutDefaultsOverride(MyDefaultsOverride)` (`LAYOUT_DEFAULTS_OVERRIDE`) and/or
`withRelationsDefaultsOverride(MyDefaultsOverride)` (`RELATIONS_DEFAULTS_OVERRIDE`).

## 9. Custom components and custom relations in editors

- `withCustomComponents(MyCustomComponentsRegister, () => inject(CustomComponentsRegister).registeredChange)` —
  register extends `CustomComponentsRegister` (`getRegisteredComponents()`, `getConfigurationForComponent(name)`,
  `setConfigurationForComponent(name, config)`; base `CustomDynamicItemsRegister`); config
  `CustomComponentConfiguration {displayName?, description?, group?, configurableProperties?: {<innerId>: {<ModelClassName>: ['prop']}}}`.
  Extra arguments are palette refresh observables.
- `[showCustomComponentOptions]="'contactCard'"` (`ShowCustomComponentOptionsDirective`) opens
  `CustomComponentOptionsComponent` to choose configurable properties (`CustomComponentOptionsData`).
- `withCustomRelations(MyCustomRelationsRegister)` — `CustomRelationsRegister` / `CustomRelationsConfiguration`.
- Internals: `CustomComponentsDynamicModuleItemsProvider|RelationsProvider|TypesProvider`,
  `CustomRelationsDynamicModuleItemsProvider|RelationsProvider`, `PlaceholderHandler`, `IdSetterExtension`,
  `getCustomComponentMeta()`, `ContentComponentData`, `ComponentWithId`, `LayoutComponentsRegisterType`,
  `CustomDynamicItemConfiguration`.
- Runtime data flow and stored metadata: `samples.md` → Custom components, `relations-metadata.md` → 9.

## 10. Static components in the relations editor

`withStaticComponents(MyStaticComponentsRegister)`; register extends `StaticComponentsRegister` and
implements `protected getDefinedTypes(): Dictionary<Type<unknown>>` (relations id → component class,
class needs `@RelationsEditorMetadata`). Nodes appear under package `static-components`
(`StaticComponentsRelationsNodesProvider`, `StaticComponentsRelationsTypesProvider`). Runtime: `samples.md`.

## 11. Code editor

`<code-editor [content] [languageModel] (save) (contentChange)>` (`CodeEditorComponent`,
`CodeEditorModule`), dialog `CodeEditorDialogComponent` (`CodeEditorDialogData {content, languageModel}`,
result `CodeEditorContent {content, code}` — `code` is compiled output). Language models
(`LanguageModel(language, extension, compiledCode, initialData?, initLanguage?)`): `CssLanguageModel`,
`HtmlLanguageModel`, `JsonLanguageModel`, `HandlebarsLanguageModel`, `TypescriptLanguageModel(initialValue)`.
Monaco loading: `MonacoEditorApi`, `AmdMonacoEditorLoader`, `MonacoEditorType`, `MONACO_EDITOR_RESOURCES_PATH`.
Typings for code nodes as text: `@anglr/dynamic/typings/transformData/monaco-type`, `@anglr/dynamic/typings/state/monaco-type`.

## 12. Relations debugger (experimental)

Enable in the runtime scope: `provideDynamic(…)`, `...provideRelationsDebugger()` (`@anglr/dynamic/relations`)
and `provideRelationsDebuggerImplementation()` (`@anglr/dynamic/relations-debugger`). Then a button
`<button [showRelationsDebugger] [relationsDefinition]="relations" [playDelay]="1500">Debug</button>`
(`ShowRelationsDebuggerDirective`, optional `containerElement` selector) opens
`RelationsDebuggerVisualizerComponent`, which replays recorded registrations/transfers step by step.
`@DebugData({inputs, outputs})` declares endpoints for the debugger (`getDebugData()`); data types
`RelationsDebugData`, `RelationsStepDebugInfo`, `Relations*DebugInfo`. Abstract `RelationsDebugger`,
`RELATIONS_DEBUGGER_TYPE`; implementation `RelationsDebuggerImpl` with debug canvas/nodes
(`RelationsCanvasDebugComponent`, `DebuggerNodeComponent`, `RelationNodeInputDebugComponent`,
`RelationNodeOutputDebugComponent`, `NodeRelationPathDebug`, `MetadataHistoryManagerDebug`,
`RelationsDebuggerDynamicModuleItemsProvider`, `RELATIONS_DEBUGGER_RELATIONS_NODES_PROVIDER`, pipes
`JsonFormattedPipe`, `StepNamePipe`). The hooks run **only** when the build-time global
`ngRelationsDebugger` is defined as `true` (Angular build `define`, default `false`, see `setup.md` → 2);
without it the debugger has nothing to show.
