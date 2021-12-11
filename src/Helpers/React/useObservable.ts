import { useEffect, useState } from "react";
import { Observable } from "rxjs";

export function useObservableState<T>(source: Observable<T>, initial: T) {
  const [state, setState] = useState<T>(initial);

  useEffect(() => {
    const subscription = source.subscribe(setState);

    return () => subscription.unsubscribe();
  }, [source]);

  return [state];
}