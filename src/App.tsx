/* eslint-disable no-restricted-globals */

// TODO:
// Инвертировать таймер отдыха
// Сигнал звуковой
// Сделать отсечку в 1 минуту минимума интервала
// Показывать незаконченый интервал
// Показывать текущее время
// Сделать часовой циферблат с интервалами текущего дня
// Контрол настройки - редактор json'а прикрутить
// Подсветка интервалов когда компьютер был включен
// Показывать уведомление
// Дизайн
// Сохранять бекап в файл на GDisk window.showOpenFilePicker() + fsapi
// Добавить кнопки подвинуть старт текущего интервала +1 мин/-1 мин

import fontawesome from '@fortawesome/fontawesome';
import { faCoffee, faGamepad, faPlay, faPlus, faStop, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import _ from 'lodash';
import { bind } from 'lodash-decorators';
import moment from 'moment';
import React from 'react';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import './App.scss';
import { BEM, cn } from './Helpers/BEM';
import { Effect1 } from './Effect1';
import { MultiLineString } from './helpers';
import { Map } from './Helpers/React/Map';
import { GetIntersection, IInterval } from './IInterval';
import { PWAUpdateAvailable, skipWaiting } from './serviceWorkerRegistration';
import { VirtualScroll } from './Helpers/React/VirtualScroll';

fontawesome.library.add(...[faTrash, faPlus, faPlay, faStop, faCoffee, faGamepad] as any[]);
type TimerStateType = 'focusing' | 'stopped';

moment.locale('ru_RU');

const Config = (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') ? {
  pomodoroMinutes: 1,
  smallRestMinutes: 1,
  longRestMinutes: 5,
  longRestPerPomodoros: 4,
  firstDayHour: 6,
  cheatMultiplier: 30 / 25
} : {
  pomodoroMinutes: 25,
  smallRestMinutes: 5,
  longRestMinutes: 60,
  longRestPerPomodoros: 4,
  firstDayHour: 6,
  cheatMultiplier: 30 / 25
}

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

function getStartAndEndOfDay(day: Date, offsetHours: number = 0): { start: Date, end: Date } {
  const start = new Date(day);
  start.setHours(offsetHours, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23 + offsetHours, 59, 59, 999);

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
  let secondsString = seconds.toFixed(0);

  if (secondsString.length === 1) {
    secondsString = '0' + secondsString;
  }

  return `${minutesString}:${secondsString}`
}

const DayTicksLength = 24 * 60 * 60 * 1000;
const LSIntervals = 'LSIntervals';
const LSContexts = 'LSContexts';
const Colors = ['blue', 'red', 'green', 'yellow', 'black', 'orange'];

export class IntervalsTimeline extends React.Component<
  { Intervals: IFocusingInterval[], className?: string },
  { DaysOffset: number, DaysCount: number }> {

  private _hours = [...Array(24).keys()].map(h => (h + Config.firstDayHour) % 24);

  constructor(props: any) {
    super(props);

    this.state = { DaysCount: 50, DaysOffset: 0 };
  }

  getAllDays() {
    const firstInterval = this.props.Intervals[0];

    const daysCount = (Date.now() - firstInterval.start.getTime()) / (24 * 60 * 60 * 1000);

    return [...Array(Math.ceil(daysCount)).keys()];
  }

  getDay(date: Date): { intervals: ITimeIntervalViewModel[], title: string } {
    const { Intervals } = this.props;

    const now = Date.now();

    const dayInterval = getStartAndEndOfDay(date, Config.firstDayHour);

    return {
      title: moment(date).format('DD.MM dd'),
      intervals: Intervals
      .filter(i => i.start >= dayInterval.start && i.start <= dayInterval.end)
      .map(interval => {
        const start = interval.start.getTime() - dayInterval.start.getTime();
        const width = (interval.stop?.getTime() || now) - interval.start.getTime();

        return { interval, left: 100 * start / DayTicksLength, width: 100 * width / DayTicksLength };
      })
    }
  }

  getDisplayTime(totalMinutes: number): string {
    totalMinutes = Math.floor(totalMinutes);
    const minutes = totalMinutes % 60;
    const hours = (totalMinutes - minutes) / 60;

    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  getTooltip(intervals: ITimeIntervalViewModel[]): string {
    const now = Date.now();

    return _.chain(intervals)
      .groupBy(i => i.interval.context || 'default')
      .map(intervals => {
      const totalMitutes = MsToMin(_.sum(intervals.map(i => (i.interval.stop?.getTime() || now) - i.interval.start.getTime())));

        return `${intervals[0].interval.context}: ${this.getDisplayTime(totalMitutes)} * ${Config.cheatMultiplier} = ${this.getDisplayTime(totalMitutes * Config.cheatMultiplier)}`;
      })
      .value()
      .join('\n');
  }

  @bind
  renderItem(index: number) {
    const date = new Date();
    date.setDate(date.getDate() - index);

    const day = this.getDay(date);

    return <div className={elem('Day')} key={day.title} title={this.getTooltip(day.intervals)}>
      <div className={elem('DayTitle')}>
        {day.title}
      </div>
      <div className={elem('DayIntervals')}>
        <Map items={day.intervals} render={(ivm, index) =>
          <div className={elem('Interval')} key={index} style={{ left: `${ivm.left}%`, width: `${ivm.width}%`, backgroundColor: ivm.interval.contextColor }}/>
        } />
      </div>
    </div>;
  }

  render() {
    return (
      <div className={cn(block(), this.props.className)}>
        <div className={elem('HourTitles')}>
          <Map items={this._hours} render={h =>
            <div key={h} className={elem('HourTitle')}>{h}</div>
          } />
        </div>

        <VirtualScroll items={this.getAllDays()} renderItem={this.renderItem}/>
      </div>
    );
  }
}

const { block, elem } = BEM('IntervalsTimeline');

interface IContext { name: string, color: string, current: boolean, readonly?: true }

export class App extends React.Component<{}, { updateAvailable: boolean, analysis: any }> {
  private timerState: TimerStateType = 'stopped';
  private intervalRef: NodeJS.Timeout | undefined;
  private timeIntervals: IFocusingInterval[] = [];
  private currentTimeInterval: IFocusingInterval | undefined;
  private contexts: IContext[] = [{ name: 'default', color: 'lightgray', current: true, readonly: true }];
  private unmounted$ = new Subject<void>();
  private smallRestStart: Date | undefined;
  private longRestStart: Date | undefined;
  private notificationEnabled = false;
  private notificationLastTime = 0;

  constructor(props: any) {
    super(props);

    this.state = { updateAvailable: false, analysis: {} };

    this.restore();
  }

  componentDidMount() {
    PWAUpdateAvailable.pipe(takeUntil(this.unmounted$)).subscribe(() => {
      this.setState({ updateAvailable: true });
    });

    this.intervalRef = setInterval(this.tick, 1000);

    if (Notification?.permission !== 'granted') {
      Notification.requestPermission();
    }
  }

  componentWillUnmount() {
    this.unmounted$.next();

    clearInterval(this.intervalRef as any);
    this.intervalRef = undefined;
  }

  @bind
  private tick() {
    if (this.timerState === 'focusing') {
      if (!this.currentTimeInterval) {
        const context = this.currentContext;

        this.currentTimeInterval = { start: new Date(), context: context.name, contextColor: context.color };
        this.timeIntervals.push(this.currentTimeInterval);
      }
    }

    const { smallRestStart, longRestStart } = this;
    const now = new Date();
    const longRestMonitorIntervalStart = new Date();
    longRestMonitorIntervalStart.setMinutes(now.getMinutes() - (Config.pomodoroMinutes + Config.smallRestMinutes) * Config.longRestPerPomodoros)

    const currentFocusingTime = this.currentTimeInterval ? now.getTime() - this.currentTimeInterval.start.getTime() : undefined;
    const needToSmallRest = currentFocusingTime && MsToMin(currentFocusingTime) >= Config.pomodoroMinutes;
    const restTimeForLongPeriod = this.getRestingTimeInInterval(longRestMonitorIntervalStart, now);
    const needToLongRest = restTimeForLongPeriod < Config.smallRestMinutes * Config.longRestPerPomodoros;
    const restingStart = smallRestStart || longRestStart;
    const restingTime = restingStart ? (now.getTime() - restingStart.getTime()) : undefined;

    if (restingTime && restingTime / 60000 > (smallRestStart ? Config.smallRestMinutes : Config.longRestMinutes)) {
      this.smallRestStart = undefined;
      this.longRestStart = undefined;
      this.notificationEnabled = true;
    }

    if (Notification.permission === 'granted' && !document.hasFocus() &&
        this.notificationEnabled && (now.getTime() - this.notificationLastTime >= 60 * 1000)) {
      this.notificationLastTime = now.getTime();

      new Notification('Go to work!', {
        renotify: true,
        tag: 'GoToWork!',
        icon: '/struggle512.png'
      });
    }

    this.setState({ analysis: { focusingTime: currentFocusingTime, needToSmallRest, restTimeForLongPeriod, needToLongRest, restingTime } });
  }

  private get currentContext(): IContext {
    return this.contexts.find(ctx => ctx.current)!;
  }

  private setTimerState(state: TimerStateType) {
    this.smallRestStart = undefined;
    this.longRestStart = undefined;

    if (state === 'stopped') {
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
    this.notificationEnabled = false;
    this.setTimerState(this.timerState === 'focusing' ? 'stopped' : 'focusing');
  }

  @bind
  private startSmallTimeout() {
    this.setTimerState('stopped');
    this.smallRestStart = new Date();
  }

  @bind
  private startLongTimeout() {
    this.setTimerState('stopped');
    this.longRestStart = new Date();
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
    this.setTimerState('stopped');

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

    if (focusingIntervals.length === 0) {
      return MsToMin(end.getTime() - start.getTime());
    }

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

  private async appUpdate() {
    await skipWaiting();
    window.location.reload();
  }

  render() {
    const { timerState, state: { updateAvailable, analysis } } = this;

    return (
      <div className={appBlock()}>
        <Effect1 className={appElem('Effect')} State={this.smallRestStart || this.longRestStart ? 'resting' : timerState} />

        <IntervalsTimeline className={appElem('Intervals')} Intervals={this.timeIntervals} />

        <div className={appElem('Settings')}>
          <div className={appElem('Contexts')}>
            {
              this.contexts.map(context => (
                <div className={appElem('Context', context.current ? 'Current' : undefined)} key={context.name} onClick={() => this.contextClicked(context)}>
                  <div className={appElem('ContextColor')} style={{ backgroundColor: context.color }} />

                  <input value={context.name} onChange={e => this.contextNameChanged(e, context)} readOnly={context.readonly} />

                  { context.readonly ? null :
                    <FontAwesomeIcon icon='trash' className={appElem('ContextRemove')} onClick={e => this.removeContext(e, context)} /> }
                </div>
              ))
            }
            <div className={appElem('AddContextButton')} onClick={this.addContext}><FontAwesomeIcon icon='plus' /></div>
          </div>
          <div className={elem('Debug')}>
            Config
            <MultiLineString String={JSON.stringify(Config, null, 4)} />
            {/* <JsonEditor json={Config} /> */}
          </div>
          <div className={elem('Debug')}>
            Recomendations
            <MultiLineString String={JSON.stringify(analysis, null, 4)} />
          </div>
        </div>

        <div className={appElem('Timer')}>
          {MsToTimeString(analysis.focusingTime || analysis.restingTime || 0)} { this.contexts.find(c => c.current)?.name || '' }

          <div className={appElem('Buttons')}>
            <div className={appElem('StartStopButton')} onClick={this.startStopButtonClick}>
              <FontAwesomeIcon icon={ timerState === 'stopped' ? 'play' : 'stop' } />
            </div>
            { analysis.needToSmallRest ?
              <div className={appElem('TimeoutButton')} onClick={this.startSmallTimeout}>
                <FontAwesomeIcon icon='coffee' />
              </div> : null }
            { analysis.needToSmallRest && analysis.needToLongRest ?
              <div className={appElem('TimeoutButton')} onClick={this.startLongTimeout}>
                <FontAwesomeIcon icon='gamepad' />
              </div> : null }
          </div>
        </div>

        {updateAvailable ? <button onClick={this.appUpdate}>Update!</button> : null}
      </div>
    );
  }
}

const { block: appBlock, elem: appElem } = BEM('App');
