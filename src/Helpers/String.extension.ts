export function IsEmptyOrWhitespaces(str: string | undefined | null) {
  return str === undefined
    || str === null
    || typeof str.match === 'undefined'
    ||  str.match(/^ *$/) !== null;
}