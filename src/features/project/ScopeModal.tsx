// 프로젝트 폴더와 읽기·쓰기 범위 바꾸기 (FR-01, S-08 "접근 범위 바꾸기")
import { useState } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useProject, useUpdateProject } from '../../api/queries'
import { Button } from '../../components/ui/Button'
import { Checkbox, Field, TextInput } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { toast } from '../../components/ui/toastStore'
import { accessScopeLabel } from '../../lib/labels'

const SCOPES = Object.keys(accessScopeLabel)

function ScopeForm({ onClose }: { onClose: () => void }) {
  const project = useProject()
  const update = useUpdateProject()
  const [dir, setDir] = useState(project.data?.work_dir ?? '')
  const [scope, setScope] = useState<string[]>(project.data?.access_scope ?? SCOPES)
  const toggle = (k: string, on: boolean) => setScope((s) => (on ? [...new Set([...s, k])] : s.filter((x) => x !== k)))
  const valid = dir.trim().length > 0 && scope.includes('config')

  const save = () =>
    update.mutate(
      {
        work_dir: dir.trim(),
        access_scope: SCOPES.filter((k) => scope.includes(k)),
      },
      {
        onSuccess: () => {
          toast('접근 범위를 바꿨어요')
          onClose()
        },
      },
    )

  return (
    <Modal
      open
      onClose={onClose}
      title="폴더와 접근 범위"
      width={600}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" disabled={!valid || update.isPending} onClick={save}>
            {update.isPending ? '저장하는 중…' : '저장'}
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        <Field label="프로젝트 폴더" help="연결 프로그램이 이 폴더 안에서만 읽고 실행해요.">
          {(id) => <TextInput id={id} value={dir} onChange={(e) => setDir(e.target.value)} placeholder="~/work/my-project" />}
        </Field>
        <div className="grid gap-2.5">
          <p className="text-aux font-bold">읽고 쓸 수 있는 범위</p>
          {SCOPES.map((k) => (
            <Checkbox key={k} checked={scope.includes(k)} onChange={(v) => toggle(k, v)}>
              {accessScopeLabel[k]}
            </Checkbox>
          ))}
        </div>
        {!scope.includes('config') && (
          <p role="alert" className="flex gap-2 note px-3.5 py-3 text-aux">
            <ExclamationTriangleIcon aria-hidden className="size-5 shrink-0" />
            AI 도구 설정 파일을 읽지 못하면 내 환경을 확인할 수 없어요. 이 항목은 꼭 필요해요.
          </p>
        )}
        <p className="text-aux text-ink-sub">스킬을 바꾸거나 되돌릴 때 쓰는 권한은 교체 확인 화면에서 따로 동의받아요.</p>
      </div>
    </Modal>
  )
}

/** 열릴 때마다 현재 값으로 폼을 새로 만든다 */
export function ScopeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return open ? <ScopeForm onClose={onClose} /> : null
}
