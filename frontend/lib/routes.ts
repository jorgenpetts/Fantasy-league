export const guestRoutes = ["/login", "/register"];

export const protectedRoutes = [
  "/",
  "/team",
  "/players",
  "/leaderboard",
  "/profile",
  "/403",
  "/admin",
];

export function isGuestRoute(pathname: string) {
  return guestRoutes.includes(pathname);
}

export function isAdminRoute(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isProtectedRoute(pathname: string) {
  return protectedRoutes.some((route) => {
    if (route === "/") {
      return pathname === "/";
    }

    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) {
    return "/";
  }

  if (value.startsWith("/login") || value.startsWith("/register")) {
    return "/";
  }

  return value;
}
