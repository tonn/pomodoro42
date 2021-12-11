import React, { ReactNode } from 'react';

export const If: React.FC<{ condition: boolean, children: ReactNode }> = ({ condition, children }) => <> {condition ? children : null} </>;