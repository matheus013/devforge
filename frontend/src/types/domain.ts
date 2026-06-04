export type ProjectStatus = "draft" | "planning" | "waiting_approval" | "active" | "blocked" | "exported";

export type Organization = {
  id: number;
  name: string;
  slug: string;
  created_at: string;
};

export type User = {
  id: number;
  email: string;
  username: string;
  role: "client" | "admin" | "staff";
};

export type Project = {
  id: number;
  organization: number;
  name: string;
  description: string;
  type: string;
  status: ProjectStatus;
  stack: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type Stage = {
  id: number;
  project: number;
  name: string;
  order: number;
  status: "todo" | "in_progress" | "blocked" | "done";
  blocker?: string;
};

export type ProjectPlan = {
  id: number;
  project: number;
  summary: string;
  features: string[];
  risks: string[];
  roadmap: string[];
  estimate: { weeks?: number; confidence?: string; team?: string };
  acceptance_criteria: string[];
  status: string;
  created_at: string;
  updated_at: string;
};

export type Ticket = {
  id: number;
  project: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  source: string;
};

export type ProjectMessage = {
  id: number;
  project: number;
  sender: "client" | "agent" | "staff";
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AgentRun = {
  id: number;
  project: number;
  skill: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  provider: string;
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  token_usage_source: string;
  currency: string;
  estimated_cost: string;
  logs: string[];
  created_at: string;
};

export type AgentRunner = "codex" | "claude-code";

export type LocalAgent = {
  key: string;
  name: string;
  skill: string;
  role: string;
  mode: string;
  runner: AgentRunner;
  enabled: boolean;
};

export type AgentRegistry = {
  active_runner: AgentRunner;
  allowed_runners: AgentRunner[];
  agents: LocalAgent[];
};

export type ProjectImport = {
  id: number;
  project: number;
  git_url: string;
  zip_file_name: string;
  status: string;
  detected_structure: Record<string, unknown>;
  created_at: string;
};

export type ProjectAssessment = {
  id: number;
  project: number;
  project_import: number | null;
  stack: string[];
  frameworks: string[];
  risks: string[];
  score: number;
  recommendation: string;
  created_at: string;
};

export type Deployment = {
  id: number;
  organization: number;
  project: number;
  environment: string;
  status: "ready" | "failed" | "disabled";
  url: string;
  notes: string;
  created_at: string;
  updated_at: string;
};
