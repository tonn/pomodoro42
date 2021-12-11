export class Defer<T> {
  readonly Promise$: Promise<T>;
  private _resolve!: (value: T) => void;
  private _reject!: (err: any) => void;

  get Resolve() { return this._resolve; }
  get Reject() { return this._reject; }

  constructor() {
    this.Promise$ = new Promise<T>((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }
}
