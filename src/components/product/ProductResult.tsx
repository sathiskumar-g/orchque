export default function ProductResult({ result }: { result: string }) {
  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <p className="text-xs font-medium text-muted-foreground mb-2">Result</p>
      {/* TODO: Replace with your actual result rendering logic */}
      <pre className="text-sm whitespace-pre-wrap font-sans">{result}</pre>
    </div>
  );
}
