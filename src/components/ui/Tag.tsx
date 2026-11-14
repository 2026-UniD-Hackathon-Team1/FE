import type { ComponentType, ReactNode, SVGProps } from 'react'
import {
  ArrowTrendingUpIcon,
  BeakerIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import type { ChangeNature, EvidenceKind, FindingVerification, Impact, Provenance } from '../../types/domain'
import { evidenceLabel, impactLabel, natureLabel, provenanceLabel, verificationLabel } from '../../lib/labels'

type Icon = ComponentType<SVGProps<SVGSVGElement>>
type Tone = 'outline' | 'soft' | 'solid'

const toneClass: Record<Tone, string> = {
  outline: 'border border-ink/55 bg-white/70',
  soft: 'bg-bg-sub',
  solid: 'bg-ink text-white',
}

/** 같은 뜻은 항상 같은 아이콘과 같은 모양 (디자인 시스템 규칙) */
export function Tag({ icon: I, tone = 'soft', children }: { icon?: Icon; tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-md px-2 text-caption font-bold whitespace-nowrap ${toneClass[tone]}`}>
      {I && <I aria-hidden className="size-3.5" />}
      {children}
    </span>
  )
}

export function NatureTag({ nature }: { nature: ChangeNature }) {
  return nature === 'action_required' ? (
    <Tag icon={ExclamationTriangleIcon} tone="solid">{natureLabel[nature]}</Tag>
  ) : (
    <Tag icon={ArrowTrendingUpIcon} tone="outline">{natureLabel[nature]}</Tag>
  )
}

const impactBars: Record<Impact, number> = { high: 3, medium: 2, low: 1 }

/** 영향도: 막대 3개 중 채운 개수 + 글자. 색에만 기대지 않는다 */
export function ImpactTag({ impact }: { impact: Impact }) {
  const n = impactBars[impact]
  return (
    <span className="inline-flex h-6 items-center gap-1.5 text-caption font-bold whitespace-nowrap">
      <span aria-hidden className="flex items-end gap-[2px]">
        {[1, 2, 3].map((i) => (
          <span key={i} className={`w-[3px] rounded-[1px] ${i <= n ? 'bg-ink' : 'bg-ink/25'}`} style={{ height: 4 + i * 3 }} />
        ))}
      </span>
      {impactLabel[impact]}
    </span>
  )
}

const provenanceIcon: Record<Provenance, Icon> = {
  official: CheckBadgeIcon,
  community: UserGroupIcon,
  unverified: QuestionMarkCircleIcon,
}
export function ProvenanceTag({ provenance }: { provenance: Provenance }) {
  return <Tag icon={provenanceIcon[provenance]}>{provenanceLabel[provenance]}</Tag>
}

const evidenceIcon: Record<EvidenceKind, Icon> = { measured: ChartBarIcon, user_verified: UserIcon, ai_note: SparklesIcon }
/** P6: 측정값 / 사용자 확인 / AI 해설 구분 */
export function EvidenceTag({ kind }: { kind: EvidenceKind }) {
  return (
    <Tag icon={evidenceIcon[kind]} tone={kind === 'measured' ? 'soft' : 'outline'}>
      {evidenceLabel[kind]}
    </Tag>
  )
}

const verificationIcon: Record<FindingVerification, Icon> = {
  reproduced: BeakerIcon,
  user_confirmed: UserIcon,
  false_positive: NoSymbolIcon,
  needs_check: QuestionMarkCircleIcon,
}
export function VerificationTag({ value }: { value: FindingVerification }) {
  return (
    <Tag icon={verificationIcon[value]} tone={value === 'needs_check' || value === 'false_positive' ? 'outline' : 'soft'}>
      {verificationLabel[value]}
    </Tag>
  )
}

/** 상태 칩 (비교 전, 정보만, 나중에 · 11.19 다시 표시 …) */
export function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-6 items-center rounded-md border border-ink/55 bg-white/70 px-2 text-caption font-bold whitespace-nowrap">
      {children}
    </span>
  )
}

/** 선택 칩 (필터, 이유 고르기) */
export function ChoiceChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-aux font-medium transition-colors duration-150 ${
        selected ? 'bg-ink text-white' : 'border border-ink/30 bg-white/80 hover:bg-bg-sub'
      }`}
    >
      {children}
    </button>
  )
}
