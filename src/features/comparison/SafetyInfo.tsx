// FR-14~17 실행 전 확인: 출처·관리 상태, 호환성·위험 신호, 필요한 권한(추가 권한 구분)
import { ArrowTopRightOnSquareIcon, CheckCircleIcon, CommandLineIcon, DocumentTextIcon, GlobeAltIcon, PencilSquareIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'
import { InfoList } from '../../components/ui/Card'
import { ProvenanceTag, Tag } from '../../components/ui/Tag'
import { compatibilityLabel, formatDate, permissionLabel } from '../../lib/labels'
import type { Candidate, PermissionKind } from '../../types/domain'

const permIcon: Record<PermissionKind, ComponentType<SVGProps<SVGSVGElement>>> = {
  file_read: DocumentTextIcon,
  file_write: PencilSquareIcon,
  network: GlobeAltIcon,
  command_exec: CommandLineIcon,
}

export function SafetyInfo({ candidate: c }: { candidate: Candidate }) {
  return (
    <div className="grid gap-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-title3">출처와 관리 상태</h3>
          <InfoList
            items={[
              ['출처 구분', <ProvenanceTag key="p" provenance={c.provenance} />],
              [
                '배포처',
                <a key="r" href={c.repository_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
                  {c.repository_url.replace(/^https?:\/\//, '')}
                  <ArrowTopRightOnSquareIcon aria-hidden className="size-3.5" />
                </a>,
              ],
              ['제작자', c.author],
              ['버전', `${c.pinned_version} (이 버전으로 고정해 비교)`],
              ['최근 관리', c.last_maintained_at ? `${formatDate(c.last_maintained_at)} 업데이트` : '확인 불가'],
              ['라이선스', c.license ?? '확인 불가'],
            ]}
          />
        </div>
        <div>
          <h3 className="mb-3 text-title3">호환성과 위험 신호</h3>
          <InfoList
            items={[
              [
                '호환성',
                <span key="c" className="inline-flex items-center gap-1">
                  <CheckCircleIcon aria-hidden className="size-4" />
                  {compatibilityLabel[c.compatibility]}
                </span>,
              ],
              ['필요 조건', c.required_setup.length ? c.required_setup.join(', ') : '추가 설정 없음'],
              ['위험 신호', c.risk_signals.length ? c.risk_signals.join(', ') : '확인된 위험 신호 없음'],
            ]}
          />
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-title3">필요한 권한</h3>
        <table className="w-full text-left text-aux">
          <thead className="text-caption text-ink-sub">
            <tr className="border-b border-ink/12">
              <th className="w-40 py-2 font-medium">권한</th>
              <th className="py-2 font-medium">하는 일</th>
              <th className="w-40 py-2 text-right font-medium">기존 방식과 비교</th>
            </tr>
          </thead>
          <tbody className="rows">
            {c.permissions.map((p) => {
              const I = permIcon[p.kind]
              return (
                <tr key={p.kind + p.description}>
                  <td className="py-3 font-bold">
                    <span className="inline-flex items-center gap-2">
                      <I aria-hidden className="size-[18px]" />
                      {permissionLabel[p.kind]}
                    </span>
                  </td>
                  <td className="py-3">{p.description}</td>
                  <td className="py-3 text-right">
                    {p.is_additional ? (
                      <Tag tone="solid" icon={PlusIcon}>
                        추가 권한
                      </Tag>
                    ) : (
                      <span className="text-caption text-ink-sub">기존과 같음</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-3 text-caption text-ink-sub">출처와 권한을 확인한 결과예요. 안전을 보장한다는 뜻은 아니에요.</p>
      </div>
    </div>
  )
}
