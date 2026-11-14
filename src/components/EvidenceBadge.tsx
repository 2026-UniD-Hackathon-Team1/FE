import type { EvidenceKind } from '../types/domain'
import { evidenceLabel } from '../lib/labels'

// P6: 측정값 / 사용자 확인 / AI 해설을 항상 구분해서 표시
const style: Record<EvidenceKind, string> = {
  measured: 'border-slate-400 text-slate-700',
  user_verified: 'border-slate-400 text-slate-700 border-dashed',
  ai_note: 'border-slate-300 text-slate-500 italic',
}

export function EvidenceBadge({ kind }: { kind: EvidenceKind }) {
  return (
    <span className={`inline-block rounded border px-1.5 text-[11px] leading-5 ${style[kind]}`}>
      {evidenceLabel[kind]}
    </span>
  )
}
