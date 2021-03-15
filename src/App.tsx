/* eslint-disable no-restricted-globals */
import { bind } from 'lodash-decorators';
import React from 'react';
import './App.scss';
import { BEM } from './BEM';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import fontawesome from '@fortawesome/fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import _ from 'lodash';

fontawesome.library.add(faTrash as any);

// TODO: 1. save state to localstorage
// TODO: 2. appearence
// TODO: 3. contexts
// TODO: 4. recommendation to rest and work
// TODO: 5. settings
// TODO: 6. pwa-update button


type TimerStateType = 'focusing' | 'stopped';

interface ITimeInterval {
  start: Date,
  stop?: Date,
  context?: string
}

interface ITimeIntervalViewModel {
  interval: ITimeInterval,
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

const DayTicksLength = 24 * 60 * 60 * 1000;
const LSIntervals = 'LSIntervals';
const LSContexts = 'LSContexts';
const Colors = ['blue', 'red', 'green', 'yellow', 'black', 'orange'];

export class IntervalsTimeline extends React.Component<
  { Intervals: ITimeInterval[] },
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
                <div className={elem('Interval')} style={{ left: `${ivm.left}%`, width: `${ivm.width}%` }}>
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

export class App extends React.Component<{}, {}> {
  private timerState: TimerStateType = 'stopped';
  private intervalRef: NodeJS.Timeout | undefined;
  private timeIntervals: ITimeInterval[] = [];
  private currentTimeInterval: ITimeInterval | undefined;
  private contexts: IContext[] = [{ name: 'default', color: 'lightgray', current: true, readonly: true }];


  private config = {
    pomodoroLength: 25,
    restLength: 5,
    longRestPerMinutes: 120,
    longRestLength: 60
  }

  constructor(props: any) {
    super(props);

    this.restore();
  }

  @bind
  private tick() {
    if (!this.currentTimeInterval) {
      this.currentTimeInterval = { start: new Date() };
      this.timeIntervals.push(this.currentTimeInterval);
    }

    this.setState({});
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
    if (this.timerState === 'focusing' && !confirm('Are you shure to stop?')) {
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

  render() {
    const { timerState } = this;

    return (
      <div className={appBlock()}>
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
              </div>))
          }
          <div className={appElem('AddContextButton')} onClick={this.addContext}>Add</div>
        </div>
      </div>
    );
  }
}

const { block: appBlock, elem: appElem } = BEM('App');
