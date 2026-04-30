import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-semibold mb-2">Authentication error</h1>
        <p className="text-muted-foreground text-sm mb-6">
          The verification link may have expired or already been used. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/auth/signin"
            className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium flex items-center hover:bg-primary/90 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/forgot-password"
            className="h-9 px-4 rounded-md border text-sm font-medium flex items-center hover:bg-accent transition-colors"
          >
            Reset password
          </Link>
        </div>
      </div>
    </div>
  );
}
