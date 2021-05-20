import { IsEmptyOrWhitespaces } from './String.extension';

export function BEM(blockName: string) {
  return {
    block: function (...mods: (string | null | undefined)[]) {
      return [blockName, ...mods.filter(mod => !!mod).map(mod => `${blockName}_${mod}`)].join(' ');
    },
    elem: function (elemName: string, ...mods: (string | undefined | false)[]) {
      const baseClass = `${blockName}__${elemName}`;

      const nonEmptyMods = mods.filter((mod): mod is string => mod !== false && !IsEmptyOrWhitespaces(mod));

      return [baseClass, ...nonEmptyMods.map(mod => `${baseClass}_${mod}`)].join(' ');
    }
  }
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(c => !!c).join(' ');
}
