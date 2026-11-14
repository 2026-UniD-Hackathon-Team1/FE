import type { ButtonHTMLAttributes, ComponentType, ReactNode, SVGProps } from 'react'
import { Link, type LinkProps } from 'react-router'
import { buttonClass, type Size, type Variant } from './buttonClass'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

interface CommonProps {
  variant?: Variant
  size?: Size
  icon?: Icon
  iconRight?: Icon
  children: ReactNode
}

export function Button({
  variant,
  size,
  icon: I,
  iconRight: IR,
  children,
  className = '',
  type = 'button',
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {I && <I aria-hidden className="size-[18px]" />}
      {children}
      {IR && <IR aria-hidden className="size-[18px]" />}
    </button>
  )
}

export function ButtonLink({
  variant,
  size,
  icon: I,
  iconRight: IR,
  children,
  className = '',
  disabled,
  ...rest
}: CommonProps & LinkProps & { disabled?: boolean }) {
  return (
    <Link className={buttonClass(variant, size, className)} aria-disabled={disabled || undefined} {...rest}>
      {I && <I aria-hidden className="size-[18px]" />}
      {children}
      {IR && <IR aria-hidden className="size-[18px]" />}
    </Link>
  )
}
