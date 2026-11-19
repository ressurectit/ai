# API index: layout-relations, relations-editor, relations-debugger, built-in packages

Every public export of the listed entry points with its doc-comment summary. Many exports are
editor internals (designer directives, palettes, canvas parts) that consumer code never touches;
important ones are explained in the other references.

## Contents

- @anglr/dynamic/layout-relations
- @anglr/dynamic/relations-editor
- @anglr/dynamic/relations-debugger
- @anglr/dynamic/basic-components
- @anglr/dynamic/material-components
- @anglr/dynamic/css-components
- @anglr/dynamic/handlebars-components
- @anglr/dynamic/rest-components
- @anglr/dynamic/tinymce-components
- @anglr/dynamic/math-components
- @anglr/dynamic/grid-components

## @anglr/dynamic/layout-relations

**class**

- `ComponentEndpointModel` — Component endopoint model
- `ConfigureNodeEndpointComponent` — Component used for configuring node endpoint
- `CustomComponentOptionsComponent` — Component used for displaying and editation of custom component options
- `CustomComponentsDynamicModuleItemsProvider` — Dynamic module items provider for custom components module items
- `CustomComponentsDynamicModuleRelationsProvider` — Dynamic module relations types provider, for custom components types
- `CustomComponentsDynamicModuleTypesProvider` — Dynamic module types provider, for custom components types
- `CustomComponentsRegister` — Register that contains registered custom components
- `CustomDynamicItemsRegister` — Register that contains registered custom dynamic items
- `CustomRelationsDynamicModuleItemsProvider` — Dynamic module items provider for custom relations module items
- `CustomRelationsDynamicModuleRelationsProvider` — Dynamic module relations types provider, for custom relations types
- `CustomRelationsRegister` — Register that contains registered custom relations
- `GetModelPipe` — Gets properties model using its name
- `IdSetterExtension` — Extension that sets id of component to instance of component
- `LayoutComponentsRegister` — Register for layout components that are part of relations
- `LayoutComponentsRelationsNodesProvider` — Dynamic relations nodes provider for layout components
- `LayoutComponentsRelationsTypesProvider` — Dynamic relations types provider for layout components
- `LayoutManager` — Manager of layout metadata
- `PlaceholderHandler` — Service that handles storing, obtaining of placeholder configuration, also correct rendering of placeholder or placeholder container
- `PropertiesMetadataPipe` — Gets properties metadata for for model type
- `PropertySelectedPipe` — Gets indication whether is property selected
- `ScopeRegister` — Service that is used for obtaining existing scopes from layout
- `ShowCustomComponentOptionsDirective` — Directive that is used for displaying custom component options

**function**

- `getCustomComponentMeta` — Reads custom component layout/relations metadata from storages
- `withCustomComponents` — Enables use of custom components
- `withCustomRelations` — Enables use of custom relations
- `withLayoutRelationsEditor` — Enables use of layout components inside of relations editor
- `withLayoutRelationsRuntime` — Enables use of layout relations runtime

**interface**

- `ComponentEndpointDef` — Definition of component endpoint
- `ComponentInputsRelationsOptions` — Options for component inputs relations
- `ComponentOutputsRelationsOptions` — Options for component output relations
- `ComponentWithId` — Component decorated with its own id
- `ContentComponentData` — Data that are stored for content component
- `CustomComponentComponentOptions` — Options for custom component component
- `CustomComponentConfiguration` — Configuration for custom components
- `CustomComponentDataExtensionOptions` — Options for custom component data extension
- `CustomComponentOptionsData` — Data that are passed to custom component options dialog
- `CustomComponentRelationsOptions` — Options for custom component relations
- `CustomDynamicItemConfiguration` — Configuration for custom dynamic item
- `CustomRelationRelationsOptions` — Options for custom relation relations
- `CustomRelationsConfiguration` — Configuration for custom relations
- `LayoutComponentsRegisterType` — Layout component register type definition
- `PlaceholderComponentOptions` — Options for placeholder component
- `PlaceholderContainerComponentOptions` — Options for placeholder container component

**type**

- `ConfigureNodeEndpointData` — Type that is passed as parameter to configure node endpoint dialog


## @anglr/dynamic/relations-editor

**class**

- `NodeRelationPath` — Class that represents node relation path
- `NodesPaletteComponent` — Component displaying available nodes palette
- `RelationNodeEndpointBase` — Base class for relations node endpoints (inputs/outputs)
- `RelationNodeInputComponent` — Component used to display relation node input
- `RelationNodeOutputComponent` — Component used to display relation node output
- `RelationsCanvasComponent` — Component used as designer component wrapper for relations component
- `RelationsEditorComponent` — Component that represents relations editor with palette and canvas
- `RelationsNodeBase` — Base class for relations node components
- `RelationsNodeData` — Service handling additional data for relations node editor
- `RelationsNodeHeaderComponent` — Component used for displaying relations node header
- `RelationsNodeManager` — Class used for handling relations nodes metadata
- `RelationsNodePropertiesEditorComponent` — Component used for editing display name of relations node
- `RelationsNodePropertiesModel` — Relations node properties model
- `RelationsNodeRendererDirective` — Renderer for dynamic relations node
- `ScopeRegister` — Service that is used for obtaining existing scopes
- `StaticComponentsRegister` — Register for statically typed components that are part of relations
- `StaticComponentsRelationsNodesProvider` — Dynamic relations nodes provider for static components
- `StaticComponentsRelationsTypesProvider` — Dynamic relations types provider for static components
- `ToRelationsDragDataPipe` — Transforms NodesPaletteItem item to RelationsNodeDragData

**const**

- `componentRelationsNodeExtractor` — Extracts dynamic relations node from component relations node
- `INVALIDATE_DROP` — Constant represents name of invalidation for svg drop relation
- `isRelationsModuleTypes` — Checks whether data is relations module types
- `isRelationsNodeDef` — Checks whether data is relations node def
- `REFRESH_PALETTE_OBSERVABLES` — Injection token for observables that allows refreshing of nodes palatte items
- `RELATIONS_DEFAULTS_OVERRIDE` — Injection token for relations defaults override
- `RELATIONS_HISTORY_MANAGER` — Injection token for relations history manager
- `RELATIONS_MODULE_TYPES_DATA_EXTRACTORS` — Injection token for relations module types data extractors
- `RELATIONS_MODULE_TYPES_LOADER` — Injection token for relations module types loader
- `RELATIONS_MODULE_TYPES_PROVIDERS` — Injection token for relations module types providers
- `RELATIONS_NODES_DATA_EXTRACTORS` — Injection token for relations nodes data extractors
- `RELATIONS_NODES_LOADER` — Injection token for relations nodes loader
- `RELATIONS_NODES_PROVIDERS` — Injection token for relations nodes providers
- `relationsNodeExtractor` — Extracts dynamic relations node from default locations

**enum**

- `MouseButton` — Available mouse buttons enum

**function**

- `clamp` — Clamps number between two values
- `RelationsEditorMetadata` — Sets relations editor metadata to class on which is this decorator applied
- `withRelationsDefaultsOverride` — Enables use of defaults options overrides for relations components
- `withRelationsEditor` — Enables use of relations editor core feature
- `withStaticComponents` — Enables use of static components withing relations editor

**interface**

- `Coordinates` — Coordinates of relations editor component in designer/editor
- `NodeMetadata` — Metadata for relations node
- `NodesPaletteItem` — Represents item in nodes palette
- `RelationsEditorMetadataDescriptor` — Class that represents relations editor metadata
- `RelationsEditorMetadataInfo` — Holds meta information about relations node
- `RelationsEditorMetadataType` — Definition of type that holds relations editor metadata
- `RelationsEditorMetaInfo` — Definition of relations editor meta info
- `RelationsEndpoint` — Describes relations endpoint (input/output)
- `RelationsInput` — Describes relations input endpoint
- `RelationsNode` — Definition of relations node
- `RelationsNodeAdditionalData` — Additional for relations nodes
- `RelationsNodeDragData` — Drag data that are passed to relations canvas droplist
- `RelationsNodeEditorData` — Relations node editor data
- `RelationsNodeMetadata` — Relations node metadata
- `RelationsNodeProperties` — Relations node properties that can be edited
- `RelationsNodePropertiesEditorData` — Data for configure relations node properties
- `RelationsOutput` — Describes relations output endpoint
- `WaitingInputRelation` — Waiting input relation data

**type**

- `RelationsModuleTypes` — Represents available types for relations dynamic module
- `RelationsNodeDef` — Relations node definition
- `VoidObject` — Object used as void type of relation ouptuts with no data


## @anglr/dynamic/relations-debugger

**class**

- `DebuggerNodeComponent` — Relations node component for debugger node
- `JsonFormattedPipe` — Transforms data into formatted json
- `MetadataHistoryManagerDebug` — Special verson of metadata history manager for relations debugging
- `NodeRelationPathDebug` — Class that represents node relation path for debugging
- `RelationNodeInputDebugComponent` — Component used to display relation node input for debugging
- `RelationNodeOutputDebugComponent` — Component used to display relation node output for debugging
- `RelationsCanvasDebugComponent` — Component used as designer component wrapper for relations component in debugging
- `RelationsDebuggerDynamicModuleItemsProvider` — Dynamic module items provider for relations debugger module items
- `RelationsDebuggerImpl` — Service used for debugging relations
- `RelationsDebuggerVisualizerComponent` — Component used for visualization of relations debugger data
- `ShowRelationsDebuggerDirective` — Directive that shows relations debugger
- `StepNamePipe` — Transforms step into readable name

**const**

- `RELATIONS_DEBUGGER_RELATIONS_NODES_PROVIDER` — Provider for relations debugger package relations nodes provider

**function**

- `provideRelationsDebuggerImplementation` — Provides relations debugger implementation


## @anglr/dynamic/basic-components

**class**

- `BasicDynamicModuleItemsProvider` — Dynamic module items provider for basic module items
- `BasicDynamicModuleRelationsProvider` — Dynamic module relations types provider, for basic types
- `BasicDynamicModuleTypesProvider` — Dynamic module types provider, for basic types
- `ButtonPresetsPropertiesControlComponent` — Component used for displaying button presets
- `RowsColumnsModel` — Rows columns model for properties editor
- `RowsColumnsPropertiesControlComponent` — Component used for displaying editation of rows and columns

**const**

- `BUTTONS_PRESETS` — Injection token for buttons presets

**function**

- `toGridColumnsTemplate` — Gets css columns template
- `toGridRowsTemplate` — Gets css rows template
- `withBasicComponents` — Enables use of basic components feature

**interface**

- `BlockComponentOptions` — Options for block component
- `ButtonComponentOptions` — Options for button component
- `ButtonComponentRelationsOptions` — Options for button component relations
- `ButtonPreset` — Button preset {text?, cssClass} offered in button properties (BUTTONS_PRESETS)
- `ColumnDefinition` — Definition of column
- `DebounceValueRelationsOptions` — Options for debounce value relations
- `DeconstructRelationsOptions` — Options for deconstruct relations
- `EmptyRelationsOptions` — Options for empty relations
- `FirstNonNullRelationsOptions` — Options for first non null relations
- `GridPanelAreaComponentOptions` — Options for grid panel area component
- `GridPanelComponentOptions` — Options for grid panel component
- `HtmlBlockComponentOptions` — Options for html block component
- `IfBlockComponentOptions` — Options for if block component
- `ListBlockComponentOptions` — Options for list block component
- `ListBlockDataExtensionOptions` — Options for list block data extension
- `ListBlockRelationsOptions` — Options for list block relations
- `LogicalAndRelationsOptions` — Options for logical and relations
- `LogicalOrRelationsOptions` — Logical or for negation relations
- `MatchRelationsOptions` — Options for match relations
- `MergeRelationsOptions` — Options for merge relations
- `NegationRelationsOptions` — Options for negation relations
- `NotFoundRelationsOptions` — Options for not found relations
- `RowDefinition` — Definition of row
- `RowsColumnsOptions` — Options for rows/columns
- `StackPanelComponentOptions` — Options for stack panel component
- `StackPanelFlexExtensionOptions` — Options for stack panel flex extension
- `StatefullClass` — Definition of statefull class
- `StateRelationsEditorOptions` — Options for state relations
- `StateRelationsInputFunctionData` — Definition of input function data for state relations
- `StateRelationsOptions` — Options for state relations
- `SyncValuesRelationsOptions` — Options for sync values relations
- `TemplateBlockComponentOptions` — Options for template block component
- `TextBlockComponentOptions` — Options for text block component
- `ToggleButtonComponentOptions` — Options for toggle button component
- `TransformDataRelationsEditorOptions` — Options for transform data relations
- `TransformDataRelationsOptions` — Options for transform data relations
- `TriggerRelationsOptions` — Options for trigger relations
- `ValueRelationsOptions` — Options for value relations

**type**

- `ButtonType` — Available types of button
- `InputFunction` — Function that is used for handling input value
- `TransformData` — Transforms data to another form of data


## @anglr/dynamic/material-components

**class**

- `MaterialDynamicModuleItemsProvider` — Dynamic module items provider for material module items
- `MaterialDynamicModuleRelationsProvider` — Dynamic module relations types provider, for material types
- `MaterialDynamicModuleTypesProvider` — Dynamic module types provider, for material types
- `MaterialFormFieldComponentBaseModel` — Properties editor model for label/placeholder/hint/appearance of material fields
- `MaterialFormFieldComponentOptions` — Options of material fields: FormFieldComponentOptions + hint, appearance

**function**

- `withMaterialComponents` — Enables use of material components feature

**interface**

- `MaterialCheckboxComponentOptions` — Options for material checkbox component
- `MaterialDatepickerComponentOptions` — Options for material datepicker component
- `MaterialExpansionPanelComponentOptions` — Options for material expansion panel component
- `MaterialNumberFieldComponentOptions` — Options for material number field component
- `MaterialPeriodComponentOptions` — Options for material period component
- `MaterialRadioComponentOptions` — Options for material radio component
- `MaterialSelectComponentOptions` — Options for material select component
- `MaterialTabGroupComponentOptions` — Options for material tab group component
- `MaterialTextareaComponentOptions` — Options for material textarea component
- `MaterialTextFieldComponentOptions` — Options for material text field component
- `Tab` — Definition of grid panel column


## @anglr/dynamic/css-components

**class**

- `CssDynamicModuleItemsProvider` — Dynamic module items provider for css module items
- `CssDynamicModuleTypesProvider` — Dynamic module types provider, for css types

**function**

- `withCssComponents` — Enables use of css components feature

**interface**

- `StyleBlockComponentOptions` — Options for style block component


## @anglr/dynamic/handlebars-components

**class**

- `HandlebarsDynamicModuleItemsProvider` — Dynamic module items provider for handlebars module items
- `HandlebarsDynamicModuleRelationsProvider` — Dynamic module relations types provider, for handlebars types
- `HandlebarsDynamicModuleTypesProvider` — Dynamic module types provider, for handlebars types

**function**

- `withHandlebarsComponents` — Enables use of handlebars components feature

**interface**

- `DataBlockComponentOptions` — Options for data block component
- `DataTemplateRelationsOptions` — Options for data template relations


## @anglr/dynamic/rest-components

**class**

- `RestDynamicModuleItemsProvider` — Dynamic module items provider for rest module items
- `RestDynamicModuleRelationsProvider` — Dynamic module relations types provider, for rest types

**function**

- `withRestComponents` — Enables use of rest components feature

**interface**

- `RestRelationsOptions` — Options for rest relations


## @anglr/dynamic/tinymce-components

**class**

- `TinyMceDynamicModuleItemsProvider` — Dynamic module items provider for tiny MCE module items
- `TinyMceDynamicModuleRelationsProvider` — Dynamic module relations types provider, for tiny MCE types
- `TinyMceDynamicModuleTypesProvider` — Dynamic module types provider, for tiny MCE types

**function**

- `withTinyMceComponents` — Enables use of tiny MCE components feature

**interface**

- `RichTextBlockComponentOptions` — Options for rich text block component
- `RichTextSourceRelationsOptions` — Options for rich text source relations


## @anglr/dynamic/math-components

**class**

- `MathDynamicModuleItemsProvider` — Dynamic module items provider for math module items
- `MathDynamicModuleRelationsProvider` — Dynamic module relations types provider, for math types
- `MathDynamicModuleTypesProvider` — Dynamic module types provider, for math types

**function**

- `withMathComponents` — Enables use of math components feature

**interface**

- `MathAddRelationsOptions` — Options for math add relations
- `MathDivideRelationsOptions` — Options for math divide relations
- `MathMultiplyRelationsOptions` — Options for math multiply relations
- `MathPowerRelationsOptions` — Options for math power relations
- `MathRoundRelationsOptions` — Options for math round relations
- `MathSubtractRelationsOptions` — Options for math subtract relations


## @anglr/dynamic/grid-components

**class**

- `GridDynamicModuleItemsProvider` — Dynamic module items provider for grid module items
- `GridDynamicModuleRelationsProvider` — Dynamic module relations types provider, for grid types
- `GridDynamicModuleTypesProvider` — Dynamic module types provider, for grid types
- `ScopedMatrixContentRendererComponent` — Component used for rendering dynamic scoped content using new 'matrix' metadata gatherer

**function**

- `withGridComponents` — Enables use of grid components feature

**interface**

- `AsyncDataLoaderComponentOptions` — Options for async data loader component
- `AsyncDataLoaderRelationsOptions` — Options for async data loader relations
- `BasicPagingComponentOptions` — Options for basic paging component
- `DataLoaderComponentOptions` — Options for data loader component
- `DataTableComponentOptions` — Options for data table component
- `DialogMetadataSelectorComponentOptions` — Options for dialog metadata selector component
- `DialogMetadataSelectorRelationsOptions` — Options for dialog metadata selector relations
- `GridColumnComponentOptions` — Options for grid column component
- `GridColumnContentComponentOptions` — Options for grid column content component
- `GridColumnHeaderComponentOptions` — Options for grid column header component
- `GridColumnsComponentOptions` — Options for grid columns component
- `GridColumnsRelationsOptions` — Options for grid columns relations
- `GridPluginComponent` — Definition of component that provides grid plugin
- `MetadataSelectorComponentOptions` — Options for metadata selector component
- `PagingComponentOptions` — Options for paging component
- `PreviousNextPagingComponentOptions` — Options for previous next paging component
- `ShowMetadataSelectorButtonComponentOptions` — Options for show metadata selector button component
- `ShowMetadataSelectorButtonRelationsOptions` — Options for show metadata selector button relations
- `SyncDataLoaderComponentOptions` — Options for sync data loader component
- `SyncDataLoaderRelationsOptions` — Options for sync data loader relations

