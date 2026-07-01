'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Network, Shield, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../features/auth/AuthProvider';
import { cn } from '../lib/utils';

const links = [
  { href: '/', label: 'Home' },
  { href: '/blog', label: 'Blog' },
  { href: '/projects', label: 'Projects' },
  { href: '/graph', label: 'Graph' }
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(localStorage.getItem('theme') === 'dark');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Network className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline">Rivando Al Rasyid</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground',
                isActivePath(pathname, link.href) && 'bg-accent text-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" type="button" onClick={() => setDark((value) => !value)} aria-label="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button asChild variant={user ? 'secondary' : 'outline'} size="sm">
            <Link href={user ? '/admin' : '/login'}>
              <Shield className="h-4 w-4" />
              {user ? 'Admin' : 'Login'}
            </Link>
          </Button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3 md:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn('rounded-md px-3 py-2 text-sm text-muted-foreground', isActivePath(pathname, link.href) && 'bg-accent text-foreground')}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
