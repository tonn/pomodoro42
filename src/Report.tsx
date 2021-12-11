import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { useRefWithCallback } from './Helpers/React/useRefWithCallback';
import { BEM, cn } from './Helpers/BEM';
import './JsonModalEditor.scss';
import { JSONEditor } from '@json-editor/json-editor';
import { JSONSchema6 } from 'json-schema';
import { Defer } from './Helpers/Defer';
import { Button, Form, Modal } from 'react-bootstrap';
import { IFocusingInterval } from './IFocusingInterval';
import _ from 'lodash';
import DatePicker from 'react-datepicker';

export interface ReportsDialogRef {
  Show$<T>(intervals: IFocusingInterval[]): Promise<T>;
}

function notUndefined<T>(v: T | undefined): v is T {
  return v !== undefined;
}

export const ReportsDialog = forwardRef<ReportsDialogRef, { }>((props, ref) => {
  const [ isOpen, setIsOpen ] = useState(false);
  const [ intervals, setIntervals ] = useState<IFocusingInterval[]>();
  const [ projects, setProjects ] = useState<string[]>([]);
  const [ project, setProject ] = useState<string>();
  const [ resultTask, setResultTask ] = useState<Defer<any>>();
  const [ start, setStart ] = useState<Date>(new Date());
  const [ end, setEnd ] = useState<Date>(new Date());
  const [ total, setTotal ] = useState('');

  useImperativeHandle(ref, (): ReportsDialogRef => ({
    Show$: async (intervals) => {
      setIsOpen(true);
      setIntervals(intervals);

      setProjects(_.uniq(intervals.map(i => i.context)).filter(notUndefined));

      const result = new Defer<any>();
      setResultTask(result);
      return result.Promise$;
    }
  }));

  useEffect(() => {
    if (!!project && start < end && intervals) {
      const totalMs = _.sum(intervals
        .filter(i => i.context === project && i.start >= start && i.start <= end)
        .map(i => {
          const start = i.start.getTime();
          const stop = i.stop ? i.stop.getTime() : start + 25 * 60 * 1000; // +25min

          return stop - start;
        }));

      const hourMs = 60 * 60 * 1000;
      const hours = Math.floor(totalMs / hourMs);
      const minutes = (totalMs - hours * hourMs) / (60 * 1000);

      setTotal(`${hours}h ${minutes}m`);
    }
  }, [project, start, end])

  function save() {
    resultTask?.Resolve(true);
    setIsOpen(false);
  }

  return (
    <Modal show={isOpen} onHide={save} scrollable size='xl' dialogClassName={block()} >
      <Modal.Body>
        <Form.Control as='select' value={project} onChange={e => setProject(e.target.value)}>
          <option>Open this select menu</option>
          {projects.map(p => <option value={p}>{p}</option>)}
        </Form.Control>
        <DatePicker selected={start} onChange={(date: Date) => setStart(date || new Date())} />
        <DatePicker selected={end} onChange={(date: Date) => setEnd(date || new Date())} />

        <div>{project}</div>
        <div>{start.toUTCString()}</div>
        <div>{end.toUTCString()}</div>
        <div>{total}</div>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={save}>
          Ok
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

const { block, elem } = BEM('JsonModalEditor');

