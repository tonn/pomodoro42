/* eslint-disable no-restricted-globals */
import { bind } from 'lodash-decorators';
import React from 'react';
import './App.scss';
import { BEM } from './BEM';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import fontawesome from '@fortawesome/fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import _ from 'lodash';
import { GetIntersection, IInterval } from './IInterval';
import { Effect1 } from './Effect1';
import { PWAUpdateAvailable, skipWaiting } from './serviceWorkerRegistration';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

fontawesome.library.add(faTrash as any);

// TODO:
// Показывать кнопки отдыха
// Показывать тайер отдыха
// Сигнал звуковой
// Показывать статистику по контекстам - как миниму сумарное время за сегодня
// Сделать настройку времени начала рабочего дня

// Контрол настройки
// PWA-обновление
// Подсветка интервалов когда компьютер был включен
// Дизайн

type TimerStateType = 'focusing' | 'stopped';

interface IFocusingInterval {
  start: Date,
  stop?: Date,
  context?: string,
  contextColor?: string
}

interface ITimeIntervalViewModel {
  interval: IFocusingInterval,
  left: number,
  width: number
}

function getStartAndEndOfDay(day: Date): { start: Date, end: Date } {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function MsToMin(time: number) {
  return time / 1000 / 60;
}

function MsToTimeString(ms: number): string {
  let seconds = ms % 60000;
  let minutes = ms - seconds;

  seconds /= 1000;
  minutes /= 60000;

  const minutesString = minutes.toFixed(0);
  const secondsString = (seconds < 10 ? '0' : '') + seconds.toFixed(0);

  return `${minutesString}:${secondsString}`
}

const DayTicksLength = 24 * 60 * 60 * 1000;
const LSIntervals = 'LSIntervals';
const LSContexts = 'LSContexts';
const Colors = ['blue', 'red', 'green', 'yellow', 'black', 'orange'];

export class IntervalsTimeline extends React.Component<
  { Intervals: IFocusingInterval[] },
  { DaysOffset: number, DaysCount: number }> {

  private _hours = [...Array(24).keys()].map(h => h + 1);

  constructor(props: any) {
    super(props);

    this.state = { DaysCount: 5, DaysOffset: 0 };
  }

  getDays(): ITimeIntervalViewModel[][] {
    const { DaysOffset, DaysCount } = this.state;
    const { Intervals } = this.props;

    return [...Array(DaysCount).keys()]
      .map(d => d + DaysOffset)
      .map(d => {
        const day = new Date();
        day.setDate(day.getDate() - d);

        const dayInterval = getStartAndEndOfDay(day);

        return Intervals
          .filter(i => i.start >= dayInterval.start && i.start <= dayInterval.end && !!i.stop)
          .map(interval => {
            const start = interval.start.getTime() - dayInterval.start.getTime();
            const width = interval.stop!.getTime() - interval.start.getTime();

            return { interval, left: 100 * start / DayTicksLength, width: 100 * width / DayTicksLength };
          });
      });
  }

  render() {
    return (
      <div className={block()}>
        <div className={elem('HourTitles')}> {
          this._hours.map(h => (<div key={h} className={elem('HourTitle')}>{h}</div>))
        } </div>

        {
          this.getDays().map(day => (
            <div className={elem('Day')}>
              {day.map(ivm => (
                <div className={elem('Interval')} style={{ left: `${ivm.left}%`, width: `${ivm.width}%`, backgroundColor: ivm.interval.contextColor }}>
                </div>
              ))}
            </div>
          ))
        }
      </div>
    );
  }
}

const { block, elem } = BEM('IntervalsTimeline');

interface IContext { name: string, color: string, current: boolean, readonly?: true }

export class App extends React.Component<{}, { updateAvailable: boolean }> {
  private timerState: TimerStateType = 'stopped';
  private intervalRef: NodeJS.Timeout | undefined;
  private timeIntervals: IFocusingInterval[] = [];
  private currentTimeInterval: IFocusingInterval | undefined;
  private contexts: IContext[] = [{ name: 'default', color: 'lightgray', current: true, readonly: true }];
  private _unmounted$ = new Subject<void>();

  private config = {
    // pomodoroMinutes: 25,
    // smallRestMinutes: 5,
    // longRestMinutes: 60,
    // longRestPerPomodoros: 4

    pomodoroMinutes: 1,
    smallRestMinutes: 1,
    longRestMinutes: 5,
    longRestPerPomodoros: 4
  }

  constructor(props: any) {
    super(props);

    this.state = { updateAvailable: false };

    this.restore();
  }

  componentDidMount() {
    PWAUpdateAvailable.pipe(takeUntil(this._unmounted$)).subscribe(() => {
      this.setState({ updateAvailable: true });
    })
  }

  componentWillUnmount() {
    this._unmounted$.next();
  }

  @bind
  private tick() {
    if (!this.currentTimeInterval) {
      const context = this.currentContext;

      this.currentTimeInterval = { start: new Date(), context: context.name, contextColor: context.color };
      this.timeIntervals.push(this.currentTimeInterval);
    }

    this.setState({});
  }

  private get currentContext(): IContext {
    return this.contexts.find(ctx => ctx.current)!;
  }

  private setTimerState(state: TimerStateType) {
    if (state === 'focusing') {
      this.intervalRef = setInterval(this.tick, 1000);
    } else if (state === 'stopped') {
      if (this.intervalRef) {
        clearInterval(this.intervalRef);
        this.intervalRef = undefined;
      }

      if (this.currentTimeInterval) {
        this.currentTimeInterval.stop = new Date();
        this.currentTimeInterval = undefined;
      }
    }

    this.timerState = state;

    this.save();
    this.setState({});
  }

  @bind
  private startStopButtonClick() {
    if (this.timerState === 'focusing' && !confirm('Are you sure to stop?')) {
      return;
    }

    this.setTimerState(this.timerState === 'focusing' ? 'stopped' : 'focusing');
  }

  private save() {
    localStorage[LSIntervals] = JSON.stringify(this.timeIntervals);
    localStorage[LSContexts] = JSON.stringify(this.contexts);
  }

  private restore() {
    if (localStorage[LSIntervals]) {
      this.timeIntervals = JSON.parse(localStorage[LSIntervals]);

      this.timeIntervals.forEach(i => {
        i.start = new Date(i.start);
        i.stop = i.stop && new Date(i.stop);
      });
    }

    if (localStorage[LSContexts]) {
      this.contexts = JSON.parse(localStorage[LSContexts]);
    }
  }

  private getUnusedColor() {
    return Colors.find(color => !this.contexts.some(ctx => ctx.color === color)) || 'black';
  }

  @bind
  private addContext() {
    this.contexts.push({ name: '', color: this.getUnusedColor(), current: false });

    this.save();
    this.setState({});
  }

  private contextNameChanged(e: React.ChangeEvent<HTMLInputElement>, context: IContext) {
    context.name = e.currentTarget.value;

    this.save();
    this.setState({});
  }

  private removeContext(e: React.MouseEvent, context: IContext) {
    e.stopPropagation();

    if (confirm(`Remove "${context.name}"?`)) {
      _.remove(this.contexts, context);
    }

    this.save();
    this.setState({});
  }

  private contextClicked(context: IContext) {
    this.contexts.forEach(ctx => ctx.current = (ctx === context));

    this.save();
    this.setState({});
  }

  getFocusingTimeInInterval(start: Date, end: Date) {
    const intervals = this.timeIntervals.map(i => GetIntersection({ start, end }, { start: i.start, end: i.stop || end })).filter(i => i !== undefined) as IInterval[];

    return MsToMin(_.sum(intervals.map(i => i.end.getTime() - i.start.getTime())));
  }

  getRestingTimeInInterval(start: Date, end: Date) {
    const focusingIntervals = this.timeIntervals.map(i => GetIntersection({ start, end }, { start: i.start, end: i.stop || end })).filter(i => i !== undefined) as IInterval[];
    const restingIntervals: IInterval[] = [];

    for (let i = 0; i < focusingIntervals.length; ++i) {
      const focusingInterval = focusingIntervals[i];

      if (i === 0) {
        if (start < focusingInterval.start) {
          restingIntervals.push({ start, end: focusingInterval.start });
        }
      }

      if (i === focusingIntervals.length - 1) {
        if (end > focusingInterval.end) {
          restingIntervals.push({ start: focusingInterval.end, end });
        }
      }

      if (i !== focusingIntervals.length - 1) {
        const nextInterval = focusingIntervals[i + 1];

        if (focusingInterval.end < nextInterval.start) {
          restingIntervals.push({ start: focusingInterval.end, end: nextInterval.start });
        }
      }
    }

    return MsToMin(_.sum(restingIntervals.map(i => i.end.getTime() - i.start.getTime())));
  }

  private timeAnalysis() {
    const { config } = this;
    const now = new Date();
    const longRestMonitorIntervalStart = new Date();
    longRestMonitorIntervalStart.setMinutes(now.getMinutes() - (config.pomodoroMinutes + config.smallRestMinutes) * config.longRestPerPomodoros)

    const currentFocusingTime = this.currentTimeInterval ? now.getTime() - this.currentTimeInterval.start.getTime() : undefined;
    const needToSmallRest = currentFocusingTime && MsToMin(currentFocusingTime) >= config.pomodoroMinutes;
    const restTimeForLongPeriod = this.getRestingTimeInInterval(longRestMonitorIntervalStart, now);
    const needToLongRest = restTimeForLongPeriod < config.smallRestMinutes * config.longRestPerPomodoros;

    return { focusingTime: currentFocusingTime, needToSmallRest, restTimeForLongPeriod, needToLongRest }
  }

  private async appUpdate() {
    await skipWaiting();
    window.location.reload();
  }

  render() {
    const { timerState, state: { updateAvailable } } = this;

    const analysis = this.timeAnalysis();

    return (
      <div className={appBlock()}>
        <Effect1 className={appElem('Effect')} State={timerState === 'stopped' ? 1 : 2} />

        <div className={appElem('StartStopButton')} onClick={this.startStopButtonClick}>
          { timerState === 'stopped' ? 'Focus!' : 'Stop' }
        </div>

        <IntervalsTimeline Intervals={this.timeIntervals} />

        <div className={appElem('Contexts')}>
          {
            this.contexts.map(context => (
              <div className={appElem('Context', context.current ? 'Current' : undefined)} onClick={() => this.contextClicked(context)}>
                <div className={appElem('ContextColor')} style={{ backgroundColor: context.color }} />

                <input value={context.name} onChange={e => this.contextNameChanged(e, context)} readOnly={context.readonly} />

                { context.readonly ? null :
                  <FontAwesomeIcon icon='trash' className={appElem('ContextRemove')} onClick={e => this.removeContext(e, context)} /> }
              </div>
            ))
          }
          <div className={appElem('AddContextButton')} onClick={this.addContext}>Add</div>
        </div>

        <div>
          <div>Recomendations</div>
          { JSON.stringify(analysis) }
        </div>

        <div className={appElem('Timer')}>
          {MsToTimeString(analysis.focusingTime || 0)}
        </div>

        {updateAvailable ? <button onClick={this.appUpdate}>Update!</button> : null}
      </div>
    );
  }
}

const { block: appBlock, elem: appElem } = BEM('App');
