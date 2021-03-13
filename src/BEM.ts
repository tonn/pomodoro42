import { isNullOrUndefined } from 'util';

export function BEM(blockName: string) {
  return { 
    block: function (...mods: (string | null | undefined)[]) {
      return [blockName, ...mods.filter(mod => !!mod).map(mod => `${blockName}_${mod}`)].join(' ');
    },
    elem: function (elemName: string, ...mods: (string | undefined)[]) {
      const baseClass = `${blockName}__${elemName}`;
    
      return [baseClass, ...mods.filter(mod => !isNullOrUndefined(mod)).map(mod => `${baseClass}_${mod}`)].join(' ');
    }
  }
}