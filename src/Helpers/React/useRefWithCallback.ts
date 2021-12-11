import { useCallback, useState } from "react";

export function useRefWithCallback<T>(onMount: (ref: T) => void, onUnmount?: (ref: T) => void, deps?: any[]) {
  const [nodeRef, setNodeRef] = useState<T>();

  const setRef = useCallback(node => {
    if (nodeRef && onUnmount) {
      onUnmount(nodeRef);
    }

    setNodeRef(node);

    if (node) {
      onMount(node);
    }
  }, [onMount, onUnmount, nodeRef, ...deps || []]);

  return setRef;
}
