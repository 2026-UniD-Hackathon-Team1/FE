// 환경 항목 직접 추가·수정 (FR-01: 자동으로 확인하지 못한 항목은 사용자가 입력)
import { useState } from 'react'
import { useAddEnvItem, useUpdateEnvItem } from '../../api/queries'
import { Button } from '../../components/ui/Button'
import { Checkbox, Field, Select, TextInput } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { toast } from '../../components/ui/toastStore'
import type { EnvItemInput } from '../../types/api'

const empty: EnvItemInput = {
  kind: 'model',
  name: '',
  version: null,
  source: null,
  excluded: false,
}

function EnvItemForm({ initial, edit, onClose }: { initial?: EnvItemInput; edit: boolean; onClose: () => void }) {
  const add = useAddEnvItem()
  const update = useUpdateEnvItem()
  const [form, setForm] = useState<EnvItemInput>(initial ?? empty)
  const editing = edit && !!initial
  const pending = add.isPending || update.isPending
  const error = add.error ?? update.error

  const submit = () => {
    const body = {
      ...form,
      name: form.name.trim(),
      version: form.version?.trim() || null,
      source: form.source?.trim() || null,
    }
    const done = {
      onSuccess: () => {
        toast(editing ? `${body.name}을(를) 고쳤어요` : `${body.name}을(를) 추가했어요`)
        onClose()
      },
    }
    if (editing && initial) update.mutate({ name: initial.name, body }, done)
    else add.mutate(body, done)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing && initial ? `${initial.name} 수정` : '항목 직접 추가'}
      width={560}
      footer={
        <>
          <Button onClick={onClose}>취소</Button>
          <Button variant="primary" disabled={!form.name.trim() || pending} onClick={submit}>
            {pending ? '저장하는 중…' : editing ? '저장' : '추가'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-ink-sub">
          {editing ? '자동으로 읽은 값이 틀렸다면 고쳐 주세요. 고친 내용은 다음 매칭부터 반영해요.' : '자동으로 찾지 못한 모델이나 스킬을 직접 적어 주세요.'}
        </p>
        <Field label="종류">
          {(id) => (
            <Select
              id={id}
              value={form.kind}
              disabled={editing}
              onChange={(e) =>
                setForm({
                  ...form,
                  kind: e.target.value as EnvItemInput['kind'],
                })
              }
            >
              <option value="model">모델</option>
              <option value="skill">스킬</option>
              <option value="tool">도구</option>
              <option value="config">설정 파일</option>
            </Select>
          )}
        </Field>
        <Field label="이름">{(id) => <TextInput id={id} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: claude-sonnet" />}</Field>
        {form.kind !== 'config' && (
          <Field label="버전">
            {(id) => <TextInput id={id} value={form.version ?? ''} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder='모르면 비워 두세요 · "미확인"으로 표시해요' />}
          </Field>
        )}
        <Field label="출처">
          {(id) => <TextInput id={id} value={form.source ?? ''} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="예: 설정 파일, 직접 입력" />}
        </Field>
        <Checkbox checked={!form.excluded} onChange={(v) => setForm({ ...form, excluded: !v })}>
          비교 대상에 포함
        </Checkbox>
        {error && (
          <p role="alert" className="text-aux">
            저장하지 못했어요: {error.message}
          </p>
        )}
      </div>
    </Modal>
  )
}

/** edit면 기존 항목 수정, 아니면 추가(initial은 미리 채울 값). 열릴 때마다 값을 새로 채운다 */
export function EnvItemModal({ open, initial, edit = false, onClose }: { open: boolean; initial?: EnvItemInput; edit?: boolean; onClose: () => void }) {
  return open ? <EnvItemForm initial={initial} edit={edit} onClose={onClose} /> : null
}
