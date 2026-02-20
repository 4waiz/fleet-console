import { Copyright } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-background/90">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-center px-3 py-6 sm:px-6 lg:px-8">
        <a
          href="https://awaizahmed.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:text-sm"
        >
          <span>Made by Awaiz Ahmed</span>
          <Copyright className="h-4 w-4" aria-hidden="true" />
          <span>2026</span>
        </a>
      </div>
    </footer>
  );
}
