import {ChangeDetectionStrategy, Component} from '@angular/core';
import {DateApiObject, DatePipesModule, DateTimePeriodPickerBase, DateTimePicker, PeriodData} from '@anglr/datetime';

/**
 * Data of one quarter displayed in quarter picker
 */
export interface QuarterData<TDate = unknown> extends PeriodData<TDate>
{
    /**
     * Displayed name of quarter
     */
    name: string;
}

/**
 * Period picker that displays 4 quarters of a year, use it in `periodsDefinition` of picker options
 */
@Component(
{
    selector: 'quarter-picker',
    template: `
        <div class="period">
            <div class="fas fa-angle-left clickable" (mousedown)="previousYear()"></div>
            <div class="period-value"
                 [class.clickable]="canScaleUp"
                 (mousedown)="displayDate && canScaleUp ? scaleUpSubject.next(displayDate.value) : undefined">{{displayDate?.value | dateFormat: 'year'}}</div>
            <div class="fas fa-angle-right clickable" (mousedown)="nextYear()"></div>
        </div>

        <div class="period-data quarter-data">
            @for(quarter of periodData; track quarter)
            {
                <div class="period-datum clickable"
                     [class.active]="quarter.active"
                     [class.disabled]="quarter.disabled"
                     (mousedown)="canScaleDown ? scaleDownSubject.next(quarter.dateObj.value) : selectQuarter(quarter)">{{quarter.name}}</div>
            }
        </div>
    `,
    styles: `
        .quarter-data
        {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
        }
    `,
    host:
    {
        '[class.date-time-period]': 'true',
    },
    imports:
    [
        DatePipesModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuarterPickerComponent<TDate = unknown> extends DateTimePeriodPickerBase<QuarterData<TDate>, TDate> implements DateTimePicker<TDate>
{
    //######################### protected methods - template bindings #########################

    /**
     * Selects quarter as value of picker
     * @param quarter - Selected quarter
     */
    protected selectQuarter(quarter: QuarterData<TDate>): void
    {
        if(quarter.disabled)
        {
            return;
        }

        //no value selected yet
        if(!this.singleValue?.isValid())
        {
            this.singleValue = this.displayDate?.clone() ?? this.dateApi.now();
        }

        this.singleValue.dayOfMonth(1);
        this.singleValue.year(quarter.dateObj.year());
        this.singleValue.month(quarter.dateObj.month());
        this.singleValue.updateOriginal();

        this.valueChangeSubject.next();
        this.invalidateVisuals();
    }

    /**
     * Displays next year
     */
    protected nextYear(): void
    {
        this.displayDate?.addYears(1).updateOriginal();
        this.onRender();
    }

    /**
     * Displays previous year
     */
    protected previousYear(): void
    {
        this.displayDate?.subtractYears(1).updateOriginal();
        this.onRender();
    }

    //######################### protected methods - implementation of DateTimePeriodPickerBase #########################

    /**
     * @inheritdoc
     */
    protected onRender(): void
    {
        this.periodData = [];

        if(!this.displayDate)
        {
            return;
        }

        for(let quarter = 0; quarter < 4; quarter++)
        {
            const dateObj = this.dateApi.getValue(this.displayDate.value)
                .startOfYear()
                .addMonths(quarter * 3);

            this.periodData.push(
            {
                active: false,
                disabled: false,
                date: dateObj.value,
                dateObj,
                name: `Q${quarter + 1}`,
            });
        }

        this.setActive();
        this.updateMinMax();
    }

    /**
     * @inheritdoc
     */
    protected isSamePeriod(val: DateApiObject<TDate>, target: TDate): boolean
    {
        const targetObj = this.dateApi.getValue(target);

        return val.isSameYear(target) && Math.floor(val.month() / 3) === Math.floor(targetObj.month() / 3);
    }
}
