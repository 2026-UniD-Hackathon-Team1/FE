import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

interface Crumb {
  label: string
  to?: string
}

export function PageHeader({ title, description, actions, crumbs }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; crumbs?: Crumb[] }) {
  return (
    <header className="mb-6">
      {crumbs && (
        <nav aria-label="현재 위치" className="mb-3 flex flex-wrap items-center gap-1 text-aux text-ink-sub">
          {crumbs.map((c, i) => (
            <Fragment key={i}>
              {i > 0 && <ChevronRightIcon aria-hidden className="size-3.5" />}
              {c.to ? (
                <Link to={c.to} className="hover:text-ink hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="font-bold text-ink">
                  {c.label}
                </span>
              )}
            </Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-title1 text-balance">{title}</h1>
          {description && <div className="mt-1 text-aux text-ink-sub">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
