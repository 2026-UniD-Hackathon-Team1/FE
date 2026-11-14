// S-06 교체 확인: 변경 미리보기, 추가 권한, 되돌리기 안내, 환경 재확인 (FR-28~31)
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import {
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PuzzlePieceIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { ApiError } from '../api/client'
import { useStartSwitch, useSwitchPreview } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { ErrorState, Loading } from '../components/States'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Checkbox } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Tag } from '../components/ui/Tag'
import { toast } from '../components/ui/toastStore'
import { formatWhen, permissionLabel } from '../lib/labels'
import type { Switch } from '../types/domain'

const kindIcon = {
  skill: PuzzlePieceIcon,
  setting: Cog6ToothIcon,
  file: DocumentTextIcon,
}
const kindLabel = {
  skill: '스킬',
  setting: '설정 파일',
  file: '프로젝트 파일',
}

function Step({ ok, title, sub }: { ok: boolean; title: string; sub?: string }) {
  const I = ok ? CheckCircleIcon : XCircleIcon
  return (
    <li className={`flex gap-3 rounded-[10px] border border-ink/12 px-3.5 py-3 ${ok ? '' : 'bg-bg-sub'}`}>
      <I aria-hidden className="size-6 shrink-0" />
      <div>
        <p className="font-bold">{title}</p>
        {sub && <p className="text-aux text-ink-sub">{sub}</p>}
      </div>
    </li>
  )
}

export function SwitchConfirmPage() {
  const { comparisonId = '' } = useParams()
  const navigate = useNavigate()
  const preview = useSwitchPreview(comparisonId)
  const sw = useStartSwitch()
  const [checked, setChecked] = useState(false)
  const [envAck, setEnvAck] = useState(false)
  const [result, setResult] = useState<Switch | null>(null)

  if (preview.isPending) return <Loading text="바뀔 내용을 확인하는 중이에요" />
  if (preview.isError) return <ErrorState message={preview.error.message} onRetry={() => void preview.refetch()} />

  const p = preview.data
  const envChanged = p.env_changes.length > 0
  const apply = () =>
    sw.mutate(
      { comparisonId, previewId: p.preview_id, token: p.confirmation_token },
      // 미리보기 뒤에 환경이 바뀌었으면 새 미리보기를 받아 다시 확인하게 한다 (설계서 10.3)
      {
        onSuccess: setResult,
        onError: (e) => e instanceof ApiError && e.code === 'ENVIRONMENT_CHANGED' && void preview.refetch(),
      },
    )
  const backToResult = () => void navigate(`/comparisons/${comparisonId}`)

  return (
    <>
      <PageHeader
        crumbs={[{ label: '홈', to: '/' }, { label: '비교 결과', to: `/comparisons/${comparisonId}` }, { label: '교체 확인' }]}
        title={p.manual ? '직접 적용이 필요해요' : '이렇게 바꿀게요'}
        description="바꾸기 전 상태를 먼저 백업해요. 백업에 실패하면 바꾸지 않아요."
      />

      <div className="mx-auto grid max-w-[760px] gap-4">
        <Card title={<h2 className="text-title3">바뀌는 내용</h2>} padded>
          <ul className="rows">
            {p.changes.map((ch) => {
              const I = kindIcon[ch.kind]
              return (
                <li key={ch.target} className="flex items-center gap-3 py-3">
                  <I aria-hidden className="size-5 shrink-0" />
                  <span className="w-24 text-aux text-ink-sub">{kindLabel[ch.kind]}</span>
                  <span className="flex-1 font-bold">
                    {ch.target}
                    {ch.kind === 'skill' && ' 설치'}
                  </span>
                  <span className="text-aux text-ink-sub">{ch.note}</span>
                </li>
              )
            })}
          </ul>
        </Card>

        {p.additional_permissions.length > 0 && (
          <Card title={<h2 className="text-title3">추가로 필요한 권한</h2>}>
            <ul className="grid gap-2">
              {p.additional_permissions.map((perm) => (
                <li key={perm.description} className="flex items-center gap-2 text-aux">
                  <Tag tone="solid" icon={PlusIcon}>
                    추가 권한
                  </Tag>
                  <b>{permissionLabel[perm.kind]}</b> · {perm.description}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {p.manual && (
          <Card title={<h2 className="text-title3">적용 방법</h2>} aside="이 후보는 자동 적용을 지원하지 않아요">
            <ol className="grid gap-4">
              {p.manual_steps.map((s, i) => (
                <li key={s.title} className="grid gap-2">
                  <p className="font-bold">
                    {i + 1}. {s.title}
                  </p>
                  <div className="flex items-center gap-3 rounded-lg bg-bg-sub py-1.5 pr-1.5 pl-4">
                    <code className="flex-1 font-sans text-aux break-all">{s.command}</code>
                    <Button size="sm" icon={ClipboardDocumentIcon} onClick={() => void navigator.clipboard?.writeText(s.command).then(() => toast('복사했어요'))}>
                      복사
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-aux text-ink-sub">적용한 뒤 [적용 확인]을 누르면 스킬 등록 상태와 설정을 검사해서 결과를 알려드려요.</p>
          </Card>
        )}

        <section className="glass-sub flex gap-3 px-6 py-4">
          <ArrowUturnLeftIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-bold">언제든 되돌릴 수 있어요</p>
            <p className="text-aux text-ink-sub">[이력]에서 이 교체를 골라 [이전 방식으로 되돌리기]를 누르면 백업 상태로 돌아가요. 이미 쓴 API 비용은 되돌릴 수 없어요.</p>
          </div>
        </section>

        <section className="glass flex gap-3 px-6 py-4">
          {envChanged ? <ExclamationTriangleIcon aria-hidden className="mt-0.5 size-5 shrink-0" /> : <CheckCircleIcon aria-hidden className="mt-0.5 size-5 shrink-0" />}
          <div>
            <p className="font-bold">{envChanged ? '비교한 뒤 환경이 바뀌었어요' : '내 환경이 비교할 때와 같아요'}</p>
            <p className="text-aux text-ink-sub">방금 다시 확인했어요 · {formatWhen(p.env_checked_at)}</p>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Checkbox checked={checked} onChange={setChecked}>
            바뀌는 내용과 추가 권한을 확인했어요
          </Checkbox>
          <div className="flex gap-2">
            <Button onClick={backToResult}>취소</Button>
            <Button variant="primary" disabled={!checked || sw.isPending || (envChanged && !envAck)} onClick={apply}>
              {sw.isPending ? '백업 후 바꾸는 중…' : p.manual ? '적용 확인' : '확인하고 바꾸기'}
            </Button>
          </div>
        </div>
        {sw.isError && <ErrorState title="바꾸지 못했어요" message={sw.error.message} />}
      </div>

      {/* TC-09: 비교 후 환경이 바뀌었으면 차이를 보여주고 다시 확인을 받는다 */}
      <Modal
        open={envChanged && !envAck}
        onClose={backToResult}
        title="비교한 뒤 환경이 바뀌었어요"
        footer={
          <>
            <Button onClick={() => setEnvAck(true)}>그대로 바꾸기</Button>
            <Button variant="primary" onClick={backToResult}>
              다시 비교하기
            </Button>
          </>
        }
      >
        <p className="mb-3 text-ink-sub">비교할 때와 지금 환경이 달라요. 바뀐 환경에서는 결과가 다를 수 있어요.</p>
        <ul className="rows">
          {p.env_changes.map((e) => (
            <li key={e.label} className="flex items-center gap-3 py-2.5">
              <span className="w-36 text-aux text-ink-sub">{e.label}</span>
              <span>{e.before}</span>
              <span aria-hidden className="text-ink-sub">
                →
              </span>
              <b>{e.after}</b>
            </li>
          ))}
        </ul>
      </Modal>

      {/* FR-30~31: 결과 */}
      <Modal
        open={!!result}
        onClose={() => void navigate('/history')}
        title={result?.result === 'success' ? '바꿨어요' : '바꾸지 못해서 원래대로 되돌렸어요'}
        footer={
          result?.result === 'success' ? (
            <>
              <Button onClick={() => void navigate('/history')}>이력에서 보기</Button>
              <Button variant="primary" onClick={() => void navigate('/')}>
                확인
              </Button>
            </>
          ) : (
            <>
              <Button onClick={backToResult}>닫기</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setResult(null)
                  apply()
                }}
              >
                다시 시도
              </Button>
            </>
          )
        }
      >
        {result?.result === 'success' ? (
          <ul className="grid gap-2.5">
            <Step ok title="지금 상태를 백업했어요" sub={`${formatWhen(result.applied_at)} · 스킬과 설정 파일`} />
            <Step ok title={`${p.candidate_label}을(를) 설치했어요`} sub="비교에 쓴 버전 그대로 적용했어요" />
            <Step ok title="설정을 바꿨어요" sub=".codex/config.toml · 리뷰 프롬프트 사용 안 함" />
            <Step ok title="스킬이 제대로 등록됐어요" sub="설정 파일 검사도 통과했어요" />
            <p className="mt-1 text-aux text-ink-sub">결과가 마음에 들지 않으면 [이력]에서 언제든 되돌릴 수 있어요.</p>
          </ul>
        ) : (
          <ul className="grid gap-2.5">
            <Step ok title="지금 상태를 백업했어요" />
            <Step ok={false} title="설정을 바꾸지 못했어요" sub=".codex/config.toml에 쓸 권한이 없어요" />
            <Step ok title="백업으로 자동 복원했어요" sub="바꾼 것이 하나도 남지 않았어요" />
            <p className="mt-1 text-aux text-ink-sub">파일 권한을 확인한 뒤 다시 시도해 주세요.</p>
          </ul>
        )}
      </Modal>
    </>
  )
}
