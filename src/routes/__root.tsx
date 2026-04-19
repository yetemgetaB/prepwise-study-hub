import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AppNav } from "@/components/nav/AppNav";
import { AppShell } from "@/components/AppShell";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">Page not found.</p>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Prepwise — Plan, Focus, Track" },
      { name: "description", content: "A focused study execution app for university students. Plan your day, run Pomodoro sessions, and track real progress." },
      { name: "theme-color", content: "#000000" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
        <Outlet />
      </main>
      <AppNav />
      <Toaster />
    </AppShell>
  );
}
