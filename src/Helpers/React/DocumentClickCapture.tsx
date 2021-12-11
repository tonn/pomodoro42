import React, { useEffect, useRef } from 'react';

export const DocumentClickCapture: React.FC<{ target?: Node, callback: (e: Event) => void }> = (props) => {
  const element = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const outsideClickHandler = (e: Event) => {
      const target = props.target || element.current!;

      if ((e.target && e.target instanceof Node && 
          (target === e.target || target.contains(e.target)))) {
        props.callback(e);  
      }
    };
  
    document.body.addEventListener('click', outsideClickHandler, { capture: true });

    return () => {
      document.body.removeEventListener('click', outsideClickHandler, { capture: true });
    };
  }, [props, element]);

  return <div ref={element}>{props.children}</div>;
}