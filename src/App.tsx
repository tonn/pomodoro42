import { bind } from 'lodash-decorators';
import React from 'react';
import './App.scss';
import { BEM } from './BEM';

/*
  TODO: 
  1. save state to localstorage
  2. appearence
  3. contexts
*/

type TimerStateType = 'focusing' | 'stopped';

interface ITimeInterval {
  start: Date,
  stop?: Date,
  task?: string
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

export class App extends React.Component<{}, {}> {
  private timerState: TimerStateType = 'stopped';
  private intervalRef: NodeJS.Timeout | undefined;
  private timeIntervals: ITimeInterval[] = [];
  private currentTimeInterval: ITimeInterval | undefined;

  private config = {
    pomodoroLength: 25,
    restLength: 5,
    longRestPerMinutes: 120,
    longRestLength: 60
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
    this.setState({});
  }

  @bind
  private startStopButtonClick() {
    this.setTimerState(this.timerState === 'focusing' ? 'stopped' : 'focusing');
  }

  render() {
    const { timerState } = this;

    return (
      <div className={appBlock()}>
        <div className={appElem('StartStopButton')} onClick={this.startStopButtonClick}>
          { timerState === 'stopped' ? 'Focus!' : 'Stop' }
        </div>
        <IntervalsTimeline Intervals={this.timeIntervals} />
      </div>
    );
  }
}

const { block: appBlock, elem: appElem } = BEM('App');
