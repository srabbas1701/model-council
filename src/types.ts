export interface ModelConfig {
  id: string;
  role: string;
  inputCostPerM: number;
  outputCostPerM: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface JudgeConfig {
  id: string;
  role: string;
  inputCostPerM: number;
  outputCostPerM: number;
}

export interface AppConfig {
  council: ModelConfig[];
  judge: JudgeConfig;
  defaults: {
    rounds: number;
    maxTokensPerModel: number;
  };
}

export interface ModelResponse {
  model: ModelConfig;
  content: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  error?: string;
}

export interface RoundResult {
  round: number;
  responses: ModelResponse[];
}

export interface AgreementPoint {
  topic: string;
  [role: string]: string; // "agree" | "disagree" | "neutral"
}

export interface JudgeResult {
  consensus: string;
  agreementPoints: AgreementPoint[];
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface DebateResult {
  prompt: string;
  rounds: RoundResult[];
  judge: JudgeResult;
  totalCost: number;
  durationMs: number;
}
