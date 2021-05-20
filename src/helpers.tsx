export const MultiLineString: React.FC<{ String: string }> = ({ String }) => {
  return <>{
    String.split('\n').map(line => <pre key={line}>{line}</pre>)
  }</>;
}
