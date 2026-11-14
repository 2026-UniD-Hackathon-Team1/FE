// 작업 방식 편집용 초안 ↔ API 입력 변환
import type { TaskType, WorkMethod } from '../../types/domain'
import type { WorkMethodInput } from '../../types/api'

export const MUST_OPTIONS = ['확인된 결함을 놓치지 않기', '프로젝트 규칙 지키기', '생성한 테스트가 실행되기']
export const NICE_OPTIONS = ['실행 시간', '비용', '오탐 수']

export interface MethodDraft {
  tasks: Record<TaskType, boolean>
  review: { prompt: string; skill: string; output_format: string }
  test: { prompt: string; skill: string; test_command: string }
  must: string[]
  nice: string[]
}

/** profileTasks: 1단계 "나에 대해"에서 고른 작업. 있으면 그 기준으로 칸을 보여 준다 */
export function toDraft(list: WorkMethod[] | undefined, profileTasks?: TaskType[]): MethodDraft {
  const r = list?.find((w) => w.task_type === 'code_review')
  const t = list?.find((w) => w.task_type === 'test_writing')
  const first = r ?? t
  return {
    tasks: profileTasks
      ? { code_review: profileTasks.includes('code_review'), test_writing: profileTasks.includes('test_writing') }
      : { code_review: !list || !!r, test_writing: !list || !!t },
    review: {
      prompt: r?.prompt ?? '',
      skill: r?.skill ?? '',
      output_format: r?.output_format ?? '파일·줄 번호·문제·이유',
    },
    test: {
      prompt: t?.prompt ?? '',
      skill: t?.skill ?? '',
      test_command: t?.test_command ?? 'pytest -q',
    },
    must: first?.required_conditions ?? MUST_OPTIONS.slice(0, 2),
    nice: first?.secondary_metrics ?? NICE_OPTIONS.slice(0, 2),
  }
}

export function fromDraft(d: MethodDraft): WorkMethodInput[] {
  const common = { required_conditions: d.must, secondary_metrics: d.nice }
  const out: WorkMethodInput[] = []
  if (d.tasks.code_review)
    out.push({
      task_type: 'code_review',
      prompt: d.review.prompt || null,
      skill: d.review.skill || null,
      output_format: d.review.output_format || null,
      test_command: null,
      ...common,
    })
  if (d.tasks.test_writing)
    out.push({
      task_type: 'test_writing',
      prompt: d.test.prompt || null,
      skill: d.test.skill || null,
      output_format: null,
      test_command: d.test.test_command || null,
      ...common,
    })
  return out
}

export const draftValid = (d: MethodDraft) => (d.tasks.code_review || d.tasks.test_writing) && (!d.tasks.test_writing || !!d.test.test_command.trim())
