import { once } from 'lodash-decorators';
import { BehaviorSubject } from 'rxjs';

export class Store<T> {
  private readonly _state: BehaviorSubject<T>;

  constructor(private localStorageName?: string, initialState?: T) {
    if (localStorageName && localStorage[localStorageName]) {
      initialState = JSON.parse(localStorage[localStorageName]);
    }

    if (!initialState) {
      throw Error('initialState shall be defined');
    }

    this._state = new BehaviorSubject(initialState);
  }

  Get() {
    return this._state.value;
  }

  @once
  Get$() {
    return this._state.asObservable();
  }

  Set(changes: Partial<T>) {
    this._state.next({...this.Get(), ...changes});

    if (this.localStorageName) {
      localStorage[this.localStorageName] = JSON.stringify(this.Get());
    }
  }
}
