import _ from "lodash";

interface IOpenInterval {
  start: Date;
  end?: Date;
}

interface IClosedInterval extends IOpenInterval {
  end: Date
}

export interface IInterval {
  start: Date;
  end: Date;
}

export function GetIntersection(a: IInterval, b: IInterval): IInterval | undefined {
  const result: IInterval = {
    start: _.max([a.start, b.start])!,
    end: _.min([a.end, b.end])!
  }

  return result.start < result.end ? result : undefined
}
