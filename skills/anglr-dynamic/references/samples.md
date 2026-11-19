# Samples: forms, stored metadata, custom components, static components

Condensed from the package readme (validated samples). Imports are shown once per sample.

## Contents

1. Dynamic forms
2. Loading metadata from storage (templateBlock)
3. Custom components
4. Static components in relations

## 1. Dynamic forms

`FormComponentControlBuilder.build(layout)` creates a `FormGroup` from `controlName`s of form items;
pass it to the fields through `FORM_COMPONENT_CONTROL` in the renderer providers.

```ts
import {Component, ChangeDetectionStrategy, Provider, WritableSignal, inject, signal} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {FormGroup, ReactiveFormsModule} from '@angular/forms';
import {provideDynamic} from '@anglr/dynamic';
import {LayoutComponentMetadata, LayoutComponentRendererDirective, withLayoutRuntime} from '@anglr/dynamic/layout';
import {FORM_COMPONENT_CONTROL, FormComponentControlBuilder, withFormComponents, withFormControlBuilder} from '@anglr/dynamic/form';
import {withBasicComponents} from '@anglr/dynamic/basic-components';

@Component(
{
    selector: 'dynamic-form',
    template: `@if(form(); as form)
               {
                   <form [formGroup]="form" (ngSubmit)="value.set(form.value)">
                       <ng-container *layoutComponentRenderer="metadata; providers: formProviders"/>
                       <button type="submit" class="btn btn-primary">Submit</button>
                   </form>
               }
               <pre>{{value() | json}}</pre>`,
    imports: [JsonPipe, ReactiveFormsModule, LayoutComponentRendererDirective],
    providers: [provideDynamic(withLayoutRuntime(), withBasicComponents(), withFormComponents(), withFormControlBuilder())],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DynamicFormComponent
{
    protected formBuilder: FormComponentControlBuilder = inject(FormComponentControlBuilder);
    protected metadata: LayoutComponentMetadata =
    {
        id: 'stackPanel-form', package: 'basic-components', name: 'stackPanel',
        options:
        {
            children:
            [
                {id: 'textField-name', package: 'form-components', name: 'textField', options: {controlName: 'name', label: 'Name', placeholder: 'Enter your name'}},
                {id: 'numberField-age', package: 'form-components', name: 'numberField', options: {controlName: 'age', label: 'Age', placeholder: 'Enter your age'}},
                {id: 'checkbox-newsletter', package: 'form-components', name: 'checkbox', options: {controlName: 'newsletter', label: 'Subscribe to newsletter'}},
            ],
        },
    };
    protected form: WritableSignal<FormGroup|null> = signal(null);
    protected formProviders: Provider[] = [];
    protected value: WritableSignal<unknown> = signal(null);

    constructor()
    {
        this.initForm();
    }

    protected async initForm(): Promise<void>
    {
        const form = await this.formBuilder.build(this.metadata);

        this.formProviders = [{provide: FORM_COMPONENT_CONTROL, useValue: form}];
        this.form.set(form);
    }
}
```

Nested group: a `form-components/formGroup` with `{controlName: 'address', controlType: 'FormGroup', children: [...]}`.
Swap `form-components` for `material-components` to get Material fields (same option keys + `hint`, `appearance`).
Field logic via relations (`valueOutput` → … → `disabled`/`required`): use `withLayoutRelationsRuntime()` instead of `withLayoutRuntime()`.

## 2. Loading metadata from storage (templateBlock)

```ts
import {Injectable} from '@angular/core';
import {MetadataStorage} from '@anglr/dynamic';
import {LayoutComponentMetadata} from '@anglr/dynamic/layout';
import {RelationsComponentMetadata} from '@anglr/dynamic/relations';

@Injectable()
export class InMemoryLayoutMetadataStorage extends MetadataStorage<LayoutComponentMetadata>
{
    public override getMetadata(id: string): LayoutComponentMetadata|null
    {
        return structuredClone(storedLayouts[id]) ?? null;      // may also return a Promise (e.g. HTTP)
    }
}

@Injectable()
export class InMemoryRelationsMetadataStorage extends MetadataStorage<RelationsComponentMetadata[]>
{
    public override getMetadata(id: string): RelationsComponentMetadata[]|null
    {
        return structuredClone(storedRelations[id]) ?? null;
    }
}
```

```ts
providers:
[
    provideDynamic(withLayoutRelationsRuntime(),
                   withLayoutMetadataStorage(InMemoryLayoutMetadataStorage),
                   withRelationsMetadataStorage(InMemoryRelationsMetadataStorage),
                   withBasicComponents()),
],
```

Page metadata using the stored template `toggle-section` twice (each instance gets its own layout and relations):

```ts
{
    id: 'stackPanel-root', package: 'basic-components', name: 'stackPanel',
    options:
    {
        children:
        [
            {id: 'templateBlock-first', package: 'basic-components', name: 'templateBlock', options: {layoutId: 'toggle-section'}},
            {id: 'templateBlock-second', package: 'basic-components', name: 'templateBlock', options: {layoutId: 'toggle-section'}},
        ],
    },
}
```

Return clones from storages — components and the editor mutate metadata objects.

## 3. Custom components

A custom component is a stored layout + relations used as one item `custom-components/<name>`.

Register (usually server backed):

```ts
import {Injectable} from '@angular/core';
import {CustomComponentConfiguration, CustomComponentsRegister} from '@anglr/dynamic/layout-relations';
import {Observable, Subject} from 'rxjs';

@Injectable()
export class MyCustomComponentsRegister extends CustomComponentsRegister
{
    protected registeredChangeSubject: Subject<void> = new Subject<void>();

    public get registeredChange(): Observable<void>
    {
        return this.registeredChangeSubject.asObservable();
    }

    public override getRegisteredComponents(): string[]
    {
        return Object.keys(configurations);
    }

    public override getConfigurationForComponent(name: string): CustomComponentConfiguration|null
    {
        return configurations[name] ?? null;
    }

    public override setConfigurationForComponent(name: string, config: CustomComponentConfiguration): void
    {
        configurations[name] = config;
        this.registeredChangeSubject.next();
    }
}

const configurations: Record<string, CustomComponentConfiguration> =
{
    contactCard:
    {
        displayName: 'Contact card',
        description: 'Card with name and toggleable details',
        group: 'Custom components',
        configurableProperties: {'textBlock-name': {TextBlockModel: ['text']}},   // inner id -> model class name -> properties
    },
};
```

Layout and relations of `contactCard` are served by the layout / relations `MetadataStorage` under id
`contactCard` (inner layout: `stackPanel` with `textBlock-name`, `toggleButton-details`, `ifBlock-details`;
inner relations: `toggleButton-details.toggle → ifBlock-details.condition`).

Runtime page:

```ts
providers:
[
    provideDynamic(withLayoutRelationsRuntime(),
                   withCustomComponents(MyCustomComponentsRegister),
                   withLayoutMetadataStorage(CustomComponentsLayoutStorage),
                   withRelationsMetadataStorage(CustomComponentsRelationsStorage),
                   withBasicComponents()),
],
```

```ts
{
    id: 'stackPanel-root', package: 'basic-components', name: 'stackPanel',
    options:
    {
        children:
        [
            {id: 'contactCard-first', package: 'custom-components', name: 'contactCard', options: <Partial<CustomComponentComponentOptions>>{name: 'contactCard', contentOptions: {'textBlock-name': {text: 'Alice'}}}},
            {id: 'contactCard-second', package: 'custom-components', name: 'contactCard', options: <Partial<CustomComponentComponentOptions>>{name: 'contactCard', contentOptions: {'textBlock-name': {text: 'Bob'}}}},
        ],
    },
}
```

Editor: `provideDynamic(withLayoutEditor(), withCustomComponents(MyCustomComponentsRegister, () => (inject(CustomComponentsRegister) as MyCustomComponentsRegister).registeredChange), withLayoutMetadataStorage(CustomComponentsLayoutStorage), withBasicComponents())`
with `<layout-editor [metadata]="metadata" [packages]="['basic-components', 'custom-components']"/>` and
`<button type="button" [showCustomComponentOptions]="'contactCard'">Contact card options</button>`.
Inputs/outputs of a custom component: `relations-metadata.md` → 9.

## 4. Static components in relations

Your own template components can join relations: register under a fixed id, wait for
`RelationsProcessor.initialized`, call `updateRelations(id)`, clean up on destroy.

```ts
@Component({selector: 'name-input', template: '<input type="text" (input)="name = $any($event.target).value">', changeDetection: ChangeDetectionStrategy.OnPush})
@RelationsEditorMetadata(NameInputRelationsMetadataLoader)          // only needed for the relations editor
export class NameInputComponent implements RelationsComponent, OnInit, OnDestroy
{
    public static readonly relationsId: string = 'name-input';

    protected changeDetector: ChangeDetectorRef = inject(ChangeDetectorRef);
    protected relationsProcessor: RelationsProcessor = inject(RelationsProcessor);
    protected componentManager: RelationsComponentManager = inject(RelationsComponentManager);

    public relationsOptions: unknown;

    @DynamicOutput()
    public name: string|undefined|null;

    public async ngOnInit(): Promise<void>
    {
        this.componentManager.registerComponent(NameInputComponent.relationsId, this);
        await this.relationsProcessor.initialized;
        this.relationsProcessor.updateRelations(NameInputComponent.relationsId);
    }

    public ngOnDestroy(): void
    {
        this.relationsProcessor.destroyComponent(NameInputComponent.relationsId);
        this.componentManager.unregisterComponent(NameInputComponent.relationsId);
    }

    public invalidateVisuals(): void
    {
        this.changeDetector.markForCheck();
    }
}
```

A receiving component (`greeting`, input `name`) is the same with a plain `name` property and
`dynamicOnChanges(changes)` handling it. Page: `providers: [provideDynamic(withRelationsRuntime())]`,
template `<name-input/><greeting/>`, constructor `inject(RelationsManager).setRelations(relations)`:

```ts
[
    {id: 'name-input', package: 'static-components', name: 'name-input', relationsOptions: null, outputs: [{outputName: 'name', inputs: [{id: 'greeting', inputName: 'name'}]}]},
    {id: 'greeting', package: 'static-components', name: 'greeting', relationsOptions: null, outputs: []},
]
```

Relations editor for them: `provideDynamic(withRelationsEditor(), withPackageManager('STATIC_RELATIONS_PACKAGES'), withStaticComponents(MyStaticComponentsRegister))`
and `<relations-editor [metadata]="relations" [packages]="['static-components']"/>` (`editors.md` → 10).
