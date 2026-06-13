import { Outlet } from 'react-router-dom';
import { ExternalLink, GitBranch, Mail } from 'lucide-react';
import { Navbar } from './Navbar';

export function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Knowledge Portfolio. Built with React, Tailwind 4, shadcn-style UI, and Supabase.</p>
          <div className="flex gap-3">
            <a className="hover:text-foreground" href="mailto:hello@example.com" aria-label="Email">
              <Mail className="h-5 w-5" />
            </a>
            <a className="hover:text-foreground" href="https://github.com" target="_blank" rel="noreferrer" aria-label="GitHub">
              <GitBranch className="h-5 w-5" />
            </a>
            <a className="hover:text-foreground" href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <ExternalLink className="h-5 w-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
