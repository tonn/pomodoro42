import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { useRefWithCallback } from './Helpers/React/useRefWithCallback';
import { BEM, cn } from './Helpers/BEM';
import './JsonModalEditor.scss';
import { JSONEditor } from '@json-editor/json-editor';
import { JSONSchema6 } from 'json-schema';
import { Defer } from './Helpers/Defer';
import { Button, Modal } from 'react-bootstrap';

export interface JsonModalEditorRef {
  Show$<T>(value: T): Promise<T>;
}

export const JsonModalEditor = forwardRef<JsonModalEditorRef, { }>((props, ref) => {
  const [ isOpen, setIsOpen ] = useState(false);
  const [ jsonEditor, setJsonEditor ] = useState<JSONEditor & any>();
  const [ value, setValue ] = useState<any>();
  const [ resultTask, setResultTask ] = useState<Defer<any>>();

  useImperativeHandle(ref, (): JsonModalEditorRef => ({
    Show$: async (v: any) => {
      setIsOpen(true);
      setValue(v);

      const result = new Defer<any>();

      setResultTask(result);

      return result.Promise$;
    }
  }));

  function save() {
    if (resultTask) {
      resultTask.Resolve(jsonEditor.getValue());
    }

    setIsOpen(false);
  }

  const refCallback = useRefWithCallback<HTMLDivElement>(element => {
    if (!jsonEditor || jsonEditor.element !== element) {
      if (jsonEditor) {
        // TODO: destroy
        jsonEditor.destroy();
      }

      const editor: JSONEditor & any = new JSONEditor(element, {
        disable_collapse: true,
        disable_edit_json: true,
        disable_properties: true,
        disable_array_reorder: true,
        // no_additional_properties: true,
        display_required_only: true,
        array_controls_top: true,

        theme: 'bootstrap4',
        iconlib: 'fontawesome5',

        form_name_root: 'Settings',

        schema: {
          type: 'object',
          properties: {
            config: {
              type: 'object',
              format: 'grid',
              properties: {
                pomodoroMinutes: { type: 'integer' },
                smallRestMinutes: { type: 'integer' },
                longRestMinutes: { type: 'integer' },
                longRestPerPomodoros: { type: 'integer' },
                firstDayHour: { type: 'integer' },
                cheatMultiplier: { type: 'number' }
              }
            },
            contexts: {
              type: 'array',
              items: {
                $ref: '#/definitions/context'
              }
            }
          },
          definitions: {
            context: {
              type: 'object',
              format: 'grid',
              headerTemplate: '',
              required: [ 'name', 'color' ],
              properties: {
                name: { type: 'string', title: 'Name', options: { grid_column: 4 } },
                color: { type: 'string', format: 'color', title: 'Color', options: { grid_column: 4 } },
                current: { type: 'boolean' },
                readonly: { type: 'boolean' }
              }
            }
          }
        } as JSONSchema6
      });

      editor.setValue(value);

      setJsonEditor(editor);
      console.dir(editor);
    }
  }, undefined, [jsonEditor]);

  return (
    <Modal show={isOpen} onHide={save} scrollable size='xl' dialogClassName={block()} >
      <Modal.Body>
        <div className={elem('JsonEditor')} ref={refCallback} />
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={save}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

const { block, elem } = BEM('JsonModalEditor');
