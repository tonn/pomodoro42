import { ReactNode } from 'react';

import React from 'react';

export const WrapIf: React.FC<{ condition: boolean, wrap: (children: ReactNode) => ReactNode }> = 
  ({ condition, wrap, children }) => <> {condition ? wrap(children) : children} </>;
