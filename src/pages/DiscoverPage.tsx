// 후보 둘러보기: 서버가 공개 저장소에서 찾은 스킬·저장소 목록 (GET /api/catalog/candidates, /sources).
// 아직 내 작업으로 비교하지 않은 "정보"라서 좋다·나쁘다를 말하지 않는다. 내 환경과 맞는 것은 홈의 변화 목록에 올라온다.
import { useState } from 'react'
import {
  ArrowTopRightOnSquareIcon,
  CircleStackIcon,
  CodeBracketIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  PuzzlePieceIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { operatorEnabled } from '../api/client'
import { useCatalogCandidates, useCatalogSources } from '../api/queries'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, Loading } from '../components/States'
import { Button, ButtonLink } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonClass'
import { DetailRow } from '../components/ui/DetailRow'
import { Modal } from '../components/ui/Modal'
import { ChoiceChip, StatusPill, Tag } from '../components/ui/Tag'
import { formatDate, formatWhen } from '../lib/labels'
import type { CatalogCandidate, CatalogSource } from '../types/catalog'

const PAGE = 20
type Kind = 'all' | 'skill' | 'repo'
const kinds: [Kind, string][] = [
  ['all', '전체'],
  ['skill', '스킬'],
  ['repo', '저장소'],
]

/** 서버가 붙인 태그를 화면 말로. 모르는 태그는 그대로 */
const tagLabel: Record<string, string> = {
  code_review: '코드 리뷰',
  test_generation: '테스트 작성',
  concurrency: '동시성',
  boundary_values: '경계값',
  security: '보안',
  documentation: '문서',
  input_validation: '입력 검증',
  exception_handling: '예외 처리',
}
const tagText = (t: string) => tagLabel[t] ?? t

/** 같은 태그의 근거가 여러 줄이어도 태그는 한 번만 */
const uniqueTags = (c: CatalogCandidate, category: 'task_types' | 'capabilities') => [...new Set(c.tag_evidence.filter((e) => e.category === category).map((e) => e.tag))]

/** 태그 근거: 어느 파일 몇째 줄을 보고 붙였는지 */
function EvidenceModal({ c, onClose }: { c: CatalogCandidate; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} width={720} title={`${c.title} · 분류 근거`} footer={<Button onClick={onClose}>닫기</Button>}>
      <p className="text-aux text-ink-sub">서버가 후보 파일을 읽고 붙인 태그예요. 실제로 내 작업에서 나은지는 비교해 봐야 알 수 있어요.</p>
      <ul className="mt-4 grid gap-3">
        {c.tag_evidence.map((e, i) => (
          <li key={i} className="note grid gap-1.5 px-4 py-3">
            <p className="flex flex-wrap items-center gap-2">
              <Tag tone="outline">{tagText(e.tag)}</Tag>
              <span className="text-caption text-ink-sub">
                {e.category === 'task_types' ? '작업' : '기능'} · {e.path}:{e.line}
              </span>
            </p>
            <code className="block rounded-md bg-bg-sub px-3 py-2 font-mono text-caption leading-5 whitespace-pre-wrap">{e.excerpt}</code>
          </li>
        ))}
      </ul>
    </Modal>
  )
}

function CandidateRow({ c, onEvidence }: { c: CatalogCandidate; onEvidence: () => void }) {
  const tasks = uniqueTags(c, 'task_types')
  const caps = uniqueTags(c, 'capabilities')
  const KindIcon = c.kind === 'repo' ? CodeBracketIcon : PuzzlePieceIcon
  return (
    <li className="flex flex-wrap items-start gap-4 py-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-ink/55 bg-white">
        <KindIcon aria-hidden className="size-[22px]" />
      </span>
      <div className="grid min-w-0 flex-1 gap-2">
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-title3">{c.title}</span>
          <span className="text-aux text-ink-sub">{c.revision}</span>
          <Tag tone="outline">{c.kind === 'repo' ? '저장소' : c.kind === 'skill' ? '스킬' : c.kind}</Tag>
          <StatusPill>비교 전</StatusPill>
          {c.demo && <StatusPill>예시</StatusPill>}
        </p>
        <p className="flex flex-wrap items-center gap-1.5 text-aux">
          {tasks.length + caps.length === 0 ? (
            <span className="text-ink-sub">아직 어떤 작업용인지 분류하지 못했어요</span>
          ) : (
            <>
              {tasks.map((t) => (
                <span key={t} className="rounded-md bg-black px-2 py-0.5 text-[13px] leading-5 font-bold text-white">
                  {tagText(t)}
                </span>
              ))}
              {caps.map((t) => (
                <span key={t} className="rounded-md bg-ink/6 px-2 py-0.5 text-[13px] leading-5 font-medium">
                  {tagText(t)}
                </span>
              ))}
            </>
          )}
        </p>
        <p className="truncate text-caption text-ink-sub">
          {formatDate(c.first_seen_at)} 처음 발견 · {c.source_url.replace(/^https:\/\//, '')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {c.tag_evidence.length > 0 && (
          <Button size="sm" variant="ghost" icon={DocumentMagnifyingGlassIcon} onClick={onEvidence}>
            분류 근거
          </Button>
        )}
        <a href={c.source_url} target="_blank" rel="noreferrer" className={buttonClass('secondary', 'sm')}>
          출처
          <ArrowTopRightOnSquareIcon aria-hidden className="size-4" />
        </a>
      </div>
    </li>
  )
}

/** 어느 공개 저장소에서 찾는지와 마지막 수집 결과 */
function Sources({ list }: { list: CatalogSource[] }) {
  const on = list.filter((s) => s.enabled)
  const failing = on.filter((s) => s.last_error)
  const last = on.map((s) => s.last_success_at).filter(Boolean).sort().at(-1)
  return (
    <DetailRow
      icon={<CircleStackIcon aria-hidden className="size-5" />}
      title="찾아보는 곳"
      summary={`공개 저장소 ${on.length}곳 · 마지막 수집 ${formatWhen(last)}${failing.length ? ` · ${failing.length}곳 수집 실패` : ''}`}
      modalTitle="찾아보는 곳"
      modalWidth={820}
    >
      <ul className="rows">
        {list.map((s) => (
          <li key={s.source_id} className="flex flex-wrap items-center gap-3 py-3.5">
            <div className="min-w-0 flex-1">
              <a href={s.url} target="_blank" rel="noreferrer" className="font-bold underline-offset-2 hover:underline">
                {s.url.replace(/^https:\/\/(github\.com\/)?/, '')}
              </a>
              <p className="text-aux text-ink-sub">
                {s.enabled ? `마지막 수집 ${formatWhen(s.last_success_at)}` : '수집하지 않음'}
                {s.last_error && ` · 실패: ${s.last_error}`}
              </p>
            </div>
            {s.last_error ? (
              <Tag icon={ExclamationTriangleIcon} tone="outline">
                실패
              </Tag>
            ) : (
              <StatusPill>{s.enabled ? '수집 중' : '꺼짐'}</StatusPill>
            )}
          </li>
        ))}
      </ul>
    </DetailRow>
  )
}

export function DiscoverPage() {
  const [kind, setKind] = useState<Kind>('all')
  const [limit, setLimit] = useState(PAGE)
  const [evidence, setEvidence] = useState<CatalogCandidate | null>(null)
  const list = useCatalogCandidates(kind, limit)
  const sources = useCatalogSources()

  const pick = (k: Kind) => {
    setKind(k)
    setLimit(PAGE)
  }

  return (
    <div className="max-w-[1040px]">
      <PageHeader
        title="후보 둘러보기"
        description="공개 저장소에서 새로 찾은 스킬과 저장소예요. 아직 내 작업으로 비교하지 않은 정보라서, 내 환경과 맞는 것만 홈에 변화로 올라와요."
        actions={
          operatorEnabled && (
            <ButtonLink to="/discover/admin" size="sm" icon={WrenchScrewdriverIcon}>
              수집 관리
            </ButtonLink>
          )
        }
      />

      <div className="grid gap-4">
        <section className="glass p-6" aria-labelledby="cands">
          <header className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <h2 id="cands" className="text-title2">
              찾은 후보 {list.data && <span className="text-ink-sub">{list.data.total}개</span>}
            </h2>
            <div className="flex gap-2" role="group" aria-label="종류">
              {kinds.map(([k, label]) => (
                <ChoiceChip key={k} selected={kind === k} onClick={() => pick(k)}>
                  {label}
                </ChoiceChip>
              ))}
            </div>
          </header>

          {list.isPending ? (
            <Loading />
          ) : list.isError ? (
            <ErrorState message={list.error.message} onRetry={() => void list.refetch()} />
          ) : list.data.items.length === 0 ? (
            <EmptyState title="아직 찾은 후보가 없어요" description="서버가 공개 저장소를 수집하면 여기에 보여 드려요." />
          ) : (
            <>
              <ul className="rows">
                {list.data.items.map((c) => (
                  <CandidateRow key={c.candidate_version_id} c={c} onEvidence={() => setEvidence(c)} />
                ))}
              </ul>
              <footer className="mt-2 flex items-center justify-between border-t border-ink/12 pt-4 text-aux text-ink-sub">
                <span>
                  {list.data.total}개 중 {list.data.items.length}개
                </span>
                {list.data.items.length < list.data.total && (
                  <Button size="sm" onClick={() => setLimit(Math.min(limit + PAGE, 100))} disabled={list.isFetching || limit >= 100}>
                    {list.isFetching ? '불러오는 중…' : '더 보기'}
                  </Button>
                )}
              </footer>
            </>
          )}
        </section>

        {sources.data && sources.data.length > 0 && <Sources list={sources.data} />}
      </div>

      {evidence && <EvidenceModal c={evidence} onClose={() => setEvidence(null)} />}
    </div>
  )
}
