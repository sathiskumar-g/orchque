export type SkillFile = {
  path: string       // e.g. "SKILL.md", "references/api.md", "memory/skill.md"
  content: string
}

export type Skill = {
  id: string
  user_id: string
  name: string
  context: string | null
  source: 'optimized' | 'generated' | null
  is_package: boolean
  created_at: string
}

export type SkillVersion = {
  id: string
  skill_id: string
  version: string
  content: string             // always the SKILL.md content (primary)
  package_files: SkillFile[]  // [] for single-file skills
  score: number | null
  token_estimate: number | null
  token_reduction_pct: number | null
  security_flags: string[]
  improvements: string[]
  axes: {
    clarity?: number
    specificity?: number
    completeness?: number
    safety?: number
  }
  is_active: boolean
  created_at: string
}

export type ScoreResult = {
  score: number
  axes: {
    clarity: number
    specificity: number
    completeness: number
    safety: number
  }
  token_estimate: number
  token_reduction_pct: number
  security_flags: string[]
  core_improvements: string[]
  additional_improvements: string[]
}

export type OptimizerResult = {
  score: number
  axes: {
    clarity: number
    specificity: number
    completeness: number
    safety: number
  }
  token_estimate: number
  token_reduction_pct: number
  security_flags: string[]
  improvements: string[]
  optimized_content: string
}

export type GeneratorResult = {
  content: string
  title: string
  description: string
  token_estimate: number
}

export type GeneratorPackageResult = {
  title: string
  description: string
  files: SkillFile[]
  token_estimate: number
}
