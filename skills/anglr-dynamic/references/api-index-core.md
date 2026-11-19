# API index: core, layout, form, relations, layout-editor

Every public export of the listed entry points with its doc-comment summary. Many exports are
editor internals (designer directives, palettes, canvas parts) that consumer code never touches;
important ones are explained in the other references.

## Contents

- Not an import path: schematics
- @anglr/dynamic
- @anglr/dynamic/layout
- @anglr/dynamic/form
- @anglr/dynamic/relations
- @anglr/dynamic/layout-editor

## @anglr/dynamic

**class**

- `AmdMonacoEditorLoader` — Amd monaco editor loader
- `CodeEditorComponent` — Component used for editing code
- `CodeEditorDialogComponent` — Component used as dialog displaying code editor
- `CodeEditorModule` — Module for code editor stuff
- `CoreDynamicFeature` — Core dynamic feature of specified type
- `DefaultsOverride` — Gets overriden defaults for component
- `DynamicFeature` — Dynamic feature provider for enabling dynamic features
- `DynamicItemExtensionBase` — Dynamic item extension base class
- `DynamicItemLoader` — Service used for loading dynamic items
- `DynamicModuleDataExtractor` — Extractor used for extracting dynamic data from dynamic module
- `EditorHotkeys` — Class that handles hotkeys for editors
- `FactoryFn` — Wrapper for factory functions, that allows to pass factory function to provider and also "type" (which is function in javascript)
- `LanguageModel` — Class that represents language model for code editor
- `MetadataHistoryManager` — Service used for managing state of metadata
- `MetadataStorage` — Class that represents default metadata storage
- `MonacoEditorApi` — Class that makes monaco editor api accessible
- `PackageManager` — Service used for obtaining available and used packages
- `PackageManagerComponent` — Component used as package manager of dynamic packages/modules
- `PackageManagerModule` — Module for package manager components, directives and pipes

**const**

- `CssLanguageModel` — Css language model for code editor
- `defaultExportExtractor` — Extracts dynamic data which is module exports as default export
- `EDITOR_METADATA_MANAGER` — Injection token used for injecting class that allows working with state of metadata
- `extensionsExportsExtractor` — Extracts dynamic item extensions which are exported as named exports of module
- `HandlebarsLanguageModel` — Handlebars language model for code editor
- `HtmlLanguageModel` — Html language model for code editor
- `JsonLanguageModel` — Json language model for code editor
- `MONACO_EDITOR_RESOURCES_PATH` — Injection token used for injecting monaco editor resources 'path', defaults to 'monaco-editor/vs'
- `PACKAGE_SOURCES` — Injection token used for injecting package sources
- `SCOPE_ID` — Injection token used for injecting current scope id
- `TypescriptLanguageModel` — Typescript language model for code editor

**enum**

- `DynamicFeatureType` — Available types of core dynamic features

**function**

- `addSimpleChange` — Adds a SimpleChange for property into changes object (used when calling dynamicOnChanges manually)
- `DynamicClassMetadata` — Sets dynamic metadata to class on which is this decorator applied
- `DynamicPropertyMetadata` — Sets dynamic metadata to for property
- `factoryFn` — Creates factory function class
- `getJson` — Gets json from its string representation
- `isDestroyable` — Tests whether is object destroyable
- `provideDynamic` — Enables use of dynamic features in your application setting up all necessary providers
- `provideStaticPackageSource` — Gets provider for static package source
- `withEditorHotkeys` — Enables use of editor hotkeys (keyboard shortcuts)
- `withPackageManager` — Enables use of custom package manager or set up package manager with persistent storage

**interface**

- `CodeEditorContent` — Represents code editor content
- `CodeEditorDialogData` — Data for code editor dialog
- `Destroyable` — Definition of object with destroy method
- `DynamicAfterViewInit` — Interface that describes dynamic after view init phase
- `DynamicItem` — Definition of dynamic item
- `DynamicItemDefData` — Definition of dynamic item data
- `DynamicItemEditorData` — Definition of dynamic item editor data
- `DynamicItemExtension` — Definition of dynamic item extension
- `DynamicItemExtensions` — Definition of dynamic item extensions
- `DynamicItemExtensionType` — Type that represents dynamic item extension
- `DynamicItemLoaderValidatorFn` — Function that validates obtained data whether are of requested type
- `DynamicItemMetadata` — Metadata for all dynamic items
- `DynamicItemSource` — Description of dynamic source of item
- `DynamicMetadataLoader` — Describes function that loads asynchronous metadata definition
- `DynamicModule` — Description of dynamic module, containing definitions of dynamic data
- `DynamicModuleDataExtractorFn` — Function that extracts data from dynamic module
- `DynamicModuleProvider` — Dynamic module provider, used for locating dynamic module and obtaining it
- `DynamicOnChanges` — Interface that describes dynamic on changes phase
- `DynamicOnInit` — Interface that describes dynamic on init phase
- `EditorMetadataManager` — Allows obtaining editor metadata
- `FeatureProviders` — Defines feature providers
- `MonacoEditorType` — Type that represents monaco editor
- `PackageSource` — Source of package names for PackageManager (packages, packagesChange, refresh())
- `TypedFeatureProviders` — Defines feature providers by specific type


## @anglr/dynamic/layout

**class**

- `ComponentStylingExtension` — Extension that applies common component styling to component
- `DynamicLayoutModule` — Module contains components, directives, pipes for dynamic layout rendering
- `LayoutComponentBase` — Base component for layout component
- `LayoutComponentRendererDirective` — Renders layout component from metadata using LayoutRenderer
- `LayoutRenderer` — Service used for handling rendering of layout
- `LayoutRendererOptions` — Options for LayoutRendererOptions
- `NotFoundLayoutTypeComponent` — Component used for displaying not found layout type placeholder

**const**

- `isLayoutComponentDef` — Checks whether data is layout component def
- `LAYOUT_COMPONENT_CHILD_EXTENSIONS` — Injection token for layout component child extension types
- `LAYOUT_COMPONENTS_LOADER` — Injection token for layout components loader
- `LAYOUT_COMPONENTS_MODULE_DATA_EXTRACTORS` — Injection token for layout components module data extractors
- `LAYOUT_COMPONENTS_MODULE_PROVIDERS` — Injection token for layout components module providers
- `LAYOUT_METADATA_STORAGE` — Injection token for MetadataStorage of layouts (templateBlock, custom components)

**enum**

- `MissingTypeBehavior` — Defines behavior what should happen if rendered layout component type was not found
- `StyleSizeUnit` — Available types of font size units
- `TextFontWeight` — Available types of font weight

**function**

- `withLayoutMetadataStorage` — Enables use of custom layout metadata storage, used for custom components and custom templates and other components that needs to read metadata of other components
- `withLayoutRuntime` — Enables use of layout runtime core feature

**interface**

- `ComponentStylingOptions` — Options that are used for styling component
- `LayoutComponent` — Description of layout component
- `LayoutComponentMetadata` — Metadata used for rendering layout component
- `LayoutRendererItem` — Represents layout renderer item storing info about rendered component and its hierarchy
- `Margin` — Description of margin styles
- `Padding` — Description of padding styles
- `TextStyling` — Description of text styling styles

**type**

- `LayoutComponentDef` — Layout component definition


## @anglr/dynamic/form

**class**

- `FormComponentBase` — Base component for form component
- `FormComponentBaseModel` — Base form component model for properties editor
- `FormComponentControlBuilder` — Builds FormGroup from layout metadata using controlName/controlType of form items
- `FormComponentControlPipe` — Transforms control name to FormControl\|FormArray\|FormGroup
- `FormComponentOptions` — Base options of form items: controlName, controlType
- `FormDynamicModuleItemsProvider` — Dynamic module items provider for form module items
- `FormDynamicModuleRelationsProvider` — Dynamic module relations provider for form module types
- `FormDynamicModuleTypesProvider` — Dynamic module types provider, for form types
- `FormFieldComponentBaseModel` — Properties editor model for label/placeholder of form fields
- `FormFieldComponentOptions` — Options of form fields: FormComponentOptions + label, placeholder
- `FormGroupComponent` — Component used for displaying stack panel layout

**const**

- `FORM_COMPONENT_CONTROL` — Injection token for form component control

**enum**

- `FormComponentControlType` — Type of created control: FormControl, FormArray, FormGroup

**function**

- `getControlForType` — Creates FormControl/FormArray/FormGroup for FormComponentControlType
- `getFormControl` — Gets control by name from parent control or creates new one
- `withFormComponents` — Enables use of form components feature
- `withFormControlBuilder` — Enables use of form component control builder for dynamic forms

**interface**

- `CheckboxComponentOptions` — Options for checkbox component
- `DatepickerComponentOptions` — Options for datepicker component
- `FormComponent` — Contract of form item (LayoutComponent with FormComponentOptions)
- `FormGroupComponentOptions` — Options for form group component
- `NumberFieldComponentOptions` — Options for number field component
- `PeriodComponentOptions` — Options for period component
- `RadioComponentOptions` — Options for radio component
- `SelectComponentOptions` — Options for select component
- `TextareaComponentOptions` — Options for textarea component
- `TextFieldComponentOptions` — Options for text field component


## @anglr/dynamic/relations

**class**

- `CodeExecutor` — Class used for executing javascript code and obtaining types from executed javascript code
- `RelationsChangeDetector` — Change detector for relations, which allows async change detection
- `RelationsChangeDetectorOptions` — Options for RelationsChangeDetector
- `RelationsComponentManager` — Manager used for managing all components used in relations
- `RelationsDataTransferInstructionImpl` — Instruction containing data/changes that are needed for data transfer
- `RelationsDebugger` — Service used for debugging relations, use actual implementation instead of this
- `RelationsManager` — Manager of relations metadata
- `RelationsProcessor` — Processor that applies relations to registered components
- `RelationsRegistrationExtension` — Extension that allows registration of component for relations
- `ScopedRelationsDirective` — Creates scoped relations component manager and processor

**const**

- `isRelationsComponentDef` — Checks whether data is relations component def
- `RELATIONS_COMPONENTS_LOADER` — Injection token for relations components loader
- `RELATIONS_COMPONENTS_MODULE_DATA_EXTRACTORS` — Injection token for relations components module data extractors
- `RELATIONS_COMPONENTS_MODULE_PROVIDERS` — Injection token for relations components module providers
- `RELATIONS_DEBUGGER_TYPE` — Injection token for type that represents relations debugger implementation
- `RELATIONS_METADATA_STORAGE` — Injection token for MetadataStorage of relations (templateBlock, custom components/relations)
- `RELATIONS_PROCESSOR_SKIP_INIT` — Injection token for indication whether skip relations process initialization
- `relationsExportExtractor` — Extracts dynamic relations from default locations

**function**

- `DebugData` — Marks component as pure relations component, cant be used on component that is also layout component!
- `defineAssignedProp` — Defines indication that property was at least once assigned for specified property
- `defineSkipInitProp` — Defines skip initial data transfer for relations for specified property
- `DynamicOutput` — Creates dynamic output for property
- `getDebugData` — Gets debug data if defined
- `isAssigned` — Tests whether there is assigned defined for property
- `isRelationsComponentType` — Tests object whether it is RelationsComponent type
- `isSkipInit` — Tests whether there is skip init defined for property
- `provideRelationsDebugger` — Provides relations debugger
- `PureRelationsComponent` — Marks component as pure relations component, cant be used on component that is also layout component!
- `withRelationsMetadataStorage` — Enables use of custom relations metadata storage
- `withRelationsRuntime` — Enables use of relations runtime core feature

**interface**

- `MarkForCheckId` — Data that are passed when marking for check
- `RelationInputMetadata` — Metadata for input relation
- `RelationOutputMetadata` — Metadata for output relation
- `RelationsChange` — Information about change that is going to happen
- `RelationsComponent` — Description of relations component
- `RelationsComponentEndpoints` — Definition of component endpoints
- `RelationsComponentManagerComponentData` — Data stored in component itself about relations
- `RelationsComponentMetadata` — Metadata for component relations
- `RelationsComponentRegistrationDebugInfo` — Information about input and its component and data transfered
- `RelationsComponentStateDebugInfo` — Information about component state during relations debugging
- `RelationsComponentType` — Description of relations component type
- `RelationsDataTransferDebugInfo` — Information about input and its component and data transfered
- `RelationsDataTransferIdDebugInfo` — Adds unique id to transfer
- `RelationsDataTransferInstruction` — Instruction containing data/changes that are needed for data transfer
- `RelationsDebugData` — Definition of debug data for obtaining endpoints
- `RelationsOnDestroy` — Interface that describes relations on destroy phase
- `RelationsOutputDebugInfo` — Information about relations output
- `RelationsProcessorComponentData` — Metadata for single component relations
- `RelationsProcessorInputOutputData` — Metadata for single component`s output for relation manager
- `RelationsStepDebugInfo` — Information about single step that occured in relations during debugging
- `RelationsWithInjector` — Defines relations with injector instance

**type**

- `RelationsComponentDef` — Relations component definition
- `RelationsProcessorComponent` — Instance of relations processor component


## @anglr/dynamic/layout-editor

**class**

- `BaseCodePropertiesControlComponent` — Base component used for displaying code properties control
- `CombineRenderersCallbacksPipe` — Combines multipl renderers callbacks into one that calls them all
- `ComponentsPaletteComponent` — Component displaying available components palette
- `ComponentsTreeComponent` — Component displaying components tree
- `ComponentStylingModel` — Component styling model for properties editor
- `ComponentStylingPropertiesControlComponent` — Component used for displaying editation of component styling
- `DefaultGenericPropertiesControlComponent` — Component used for displaying default generic properties control, displaying specified properties
- `DndBusService` — Service that serves as communication bus for dnd
- `DndCorePaletteItemDirective` — Directive used for initializing and handling dnd core functionality for layout component palette item
- `DndCorePreviewComponent` — Component used for displaying drag preview
- `DndCorePreviewTemplateDirective` — Directive that marks attached element as html 5 drag preview template
- `DndCoreTreeItemDirective` — Directive used for initializing and handling dnd core functionality for layout component tree item
- `DragActiveService` — Service that holds information whether is currently drag active
- `InputBooleanComponent` — Component used for displaying input of type boolean
- `InputNumberComponent` — Component used for displaying input of type number
- `InputSizeComponent` — Component used for displaying input of type size string
- `InputStringComponent` — Component used for displaying input of type string
- `LayoutComponentsChildrenIterator` — Iterator for layout components children metadata
- `LayoutComponentsIterator` — Iterator for layout components metadata
- `LayoutComponentsIteratorService` — Service used for creating LayoutComponentsIterator
- `LayoutDesignerCommonDirective` — Directive for shared properties among all layout designer directives
- `LayoutDesignerDirective` — Directive that is used for rendering all needed for layout designer
- `LayoutDesignerDnDDirective` — Directive used for handling drag n drop
- `LayoutDesignerEditorMetadataDirective` — Directive that is used for accessing editor metadata for component
- `LayoutDesignerLayoutComponent` — Component displaying layout designer layout overlay
- `LayoutDesignerOverlayDirective` — Directive used for displaying layout designer overlay
- `LayoutEditorComponent` — Component that represents layout editor with palette, tree and properties
- `LayoutEditorDragPreviewComponent` — Component used for displaying layout editor drag preview
- `LayoutEditorMetadataExtractor` — Class used for extracting layout editor metadata
- `LayoutEditorMetadataManager` — Class used for handling layout metadata
- `LayoutEditorPropertyMetadataExtractor` — Service used for extracting property metadata
- `LayoutEditorRenderer` — Service used for handling rendering of layout for designer
- `LiveEventService` — Service used for handling state of layout live events
- `MarginControlComponent` — Component used for displaying editation of margin
- `MarginModel` — Margin model for properties editor
- `PaddingControlComponent` — Component used for displaying editation of padding
- `PaddingModel` — Padding model for properties editor
- `PlaceholderRenderer` — Service used for rendering placeholder
- `PropertiesControlBase` — Base class for properties control
- `PropertiesControlRendererDirective` — Directive used for rendering properties control
- `PropertiesControlsModule` — Module for properties controls components
- `PropertiesEditorComponent` — Component that represents editor for components options/properties
- `PropertyTypeControlBase` — Base class for property type control
- `PropertyTypeControlRendererDirective` — Directive used for rendering property type control
- `PropertyTypeControlsModule` — Module containing built-in property type controls
- `SelectValueComponent` — Component used for displaying options and their selection
- `TextareaComponent` — Component used for displaying textarea
- `ToLayoutDragDataPipe` — Transforms ComponentsPaletteItem item to LayoutComponentDragData
- `WidthResizerDirective` — Directive used for resizing/changing of width

**const**

- `DYNAMIC_BODY_CONTAINER` — Selector of container for dynamic body elements
- `isLayoutModuleTypes` — Checks whether data is layout module types
- `LAYOUT_DEFAULTS_OVERRIDE` — Injection token for layout defaults override
- `LAYOUT_EDITOR_PROPERTY_METADATA_PROPERTIES` — Injection token containing symbols to properties storing layout editor property metadata
- `LAYOUT_EDITOR_PROPERTY_TYPE_CONTROLS` — Injection token containing available property type controls
- `LAYOUT_HISTORY_MANAGER` — Injection token for layout history manager
- `LAYOUT_MODULE_TYPES_DATA_EXTRACTORS` — Injection token for layout module types data extractors
- `LAYOUT_MODULE_TYPES_LOADER` — Injection token for layout module types loader
- `LAYOUT_MODULE_TYPES_PROVIDERS` — Injection token for layout module types providers
- `layoutDesignerTypeExtractor` — Extracts layout designer type which is on decorated type exported by module exports as default export
- `LayoutPropertyMetadata` — Symbol defining property storing layout properties metadata
- `REFRESH_PALETTE_OBSERVABLES` — Injection token for observables that allows refreshing of components palatte items

**function**

- `codePropertiesControlFor` — Gets code properties control component for specific property
- `DescendantsGetter` — Defines function for dynamic component which is used for obtaining its descendants
- `genericPropertiesControlFor` — Gets generic properties control component for specific properties
- `getDescendantsGetter` — Gets descendants getter if is set
- `getPropertiesControl` — Gets properties control getter for specific type
- `LayoutEditorDesignerType` — Sets layout editor designer type for class on which is this decorator applied
- `LayoutEditorMetadata` — Sets layout editor metadata to class on which is this decorator applied
- `LayoutPropertyDescription` — Adds description to component property for designer
- `LayoutPropertyName` — Adds display name to component property for designer
- `LayoutPropertyObject` — Adds object metadata to component property for designer
- `LayoutPropertyType` — Adds type to component property for designer
- `LayoutPropertyValues` — Adds available values to component property for designer
- `withLayoutDefaultsOverride` — Enables use of defaults options overrides for layout components
- `withLayoutEditor` — Enables use of layout editor core feature

**interface**

- `ComponentsPaletteItem` — Represents item in component palette
- `DndCorePreviewTemplateContext` — Context passed to dnd core preview template
- `DropPlaceholderPreview` — Data used for displaying preview of drop placeholder
- `DropTargetData` — Data that occured after drag ended
- `LayoutComponentDragData` — Drag data that are passed to layout designer component
- `LayoutComponentsChildrenIteratorItem` — Item for layout components children iterator
- `LayoutComponentsIteratorItem` — Item for layout components iterator
- `LayoutDragItem` — Defines drag item data
- `LayoutDropResult` — Defines data that are set as drop result
- `LayoutEditorDesignerTypeType` — Definition of type that holds layout editor designer type
- `LayoutEditorMetadataDescriptor` — Class that represents layout editor metadata
- `LayoutEditorMetadataInfo` — Holds meta information about layout component
- `LayoutEditorMetadataManagerComponent` — Definition of component for LayoutEditorMetadataManager
- `LayoutEditorMetadataType` — Definition of type that holds layout editor metadata
- `LayoutEditorOptionsMetadata` — Metadata for options/properties editation
- `LayoutEditorPropertiesDefinitionMetadata` — Metadata for layout editor properties definition
- `LayoutPropertiesModelType` — Defines type for layout properties model
- `LayoutPropertyDescriptionData` — Layout property description data
- `LayoutPropertyNameData` — Layout property name data
- `LayoutPropertyObjectData` — Layout property object data
- `LayoutPropertyTypeData` — Layout property type data
- `LayoutPropertyValuesData` — Layout property values data
- `PropertiesControl` — Defines control that will handle displaying of properties/options of component
- `PropertiesControlGetter` — Defintion of properties control getter, that is used for getting properties control component type and optionally inputs values for it
- `PropertyTypeControl` — Defines control for specific property type

**type**

- `DefaultKnownPropertyTypes` — Default built-in property types
- `LayoutEditorPropertyMetadata` — Minimal layout editor property metadata
- `LayoutModuleTypes` — Represents available types for layout dynamic module


## Not an import path: schematics

`node_modules/@anglr/dynamic/schematics` contains a `component` schematic (`--type layout|relations|layout-relations`),
but `package.json` has no `schematics` field, so `ng generate @anglr/dynamic:component` doesn't resolve, and the
templates are outdated (kebab-case file names, generated `invalidateVisuals()` throws, `--type relations` creates an
Angular component instead of a `@PureRelationsComponent()` node). Scaffold items by following `own-package.md` instead.
