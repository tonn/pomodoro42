import React from 'react';
import JSONEditor from 'jsoneditor';

export class JsonEditor extends React.Component<{ json: any }, {}, any> {
  private _containerRef = React.createRef<HTMLDivElement>();
  private _jsonEditor: JSONEditor | undefined;

  componentDidMount() {
    if (this._containerRef.current) {
      this._jsonEditor = new JSONEditor(this._containerRef.current, { });
      this._jsonEditor.set(this.props.json);
    }
  }

  componentDidUpdate() {
    this._jsonEditor?.set(this.props.json);
  }

  componentWillUnmount() {
    this._jsonEditor?.destroy();
    this._jsonEditor = undefined;
  }

  render() {
    return <div ref={this._containerRef} />
  }
}
