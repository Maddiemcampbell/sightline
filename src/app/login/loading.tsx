export default function AuthLoading() {
  return (
    <main
      id="main-content"
      className="bg-background grid min-h-screen place-items-center px-5"
    >
      <div
        className="border-border bg-surface h-96 w-full max-w-md animate-pulse rounded-xl border"
        aria-label="Loading authentication"
      />
    </main>
  );
}
