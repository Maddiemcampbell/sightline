export function isPlatformAdminSurface(pathname: string) {
  return (
    pathname.startsWith("/internal/admin") || pathname === "/design-system"
  );
}
