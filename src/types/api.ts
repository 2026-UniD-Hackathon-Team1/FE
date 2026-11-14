import type { Candidate, Change, Match, DecisionAction } from './domain'

export interface ApiErrorBody {
  error: { code: string; message: string }
}

/** GET /api/changes 항목 */
export interface MatchedChange {
  match: Match
  change: Change
}

/** GET /api/changes/:id */
export interface ChangeDetail {
  match: Match
  change: Change
  candidates: Candidate[]
}

export interface StartComparisonBody {
  candidate_id: string
  match_id: string
  input_ids: string[]
  excluded_paths: string[]
}

export interface DecisionBody {
  action: Extract<DecisionAction, 'keep' | 'later' | 'not_interested' | 'more_comparison'>
  reason?: string
}

export interface SwitchBody {
  comparison_id: string
  /** 없으면 서버가 거부 (FR-28, TC-14) */
  confirmed: true
}

export type RollbackReason = 'worse_result' | 'inconvenient' | 'other'

export interface RollbackBody {
  reason: RollbackReason
  note?: string
}
