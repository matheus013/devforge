"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Download,
  GitBranch,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  ShieldCheck,
  TicketIcon,
  UploadCloud,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch, apiRequest } from "@/services/api";
import type {
  AgentRegistry,
  AgentRun,
  AgentRunner,
  Deployment,
  Organization,
  Project,
  ProjectAssessment,
  ProjectImport,
  ProjectMessage,
  ProjectPlan,
  QAChecklist,
  Stage,
  Ticket,
  User,
} from "@/types/domain";

const tokenKey = "devforge.access";

const authSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
  username: z.string().min(2).optional(),
});

const organizationSchema = z.object({
  name: z.string().min(2),
});

const projectSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  type: z.enum(["new_build", "imported_project", "maintenance", "audit_only"]),
});

const importSchema = z.object({
  git_url: z.string().optional(),
  zip_file_name: z.string().optional(),
});

const codexSchema = z.object({
  objective: z.string().min(8),
});

const navItems: Array<{ icon: LucideIcon; label: string }> = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: GitBranch, label: "Projetos" },
  { icon: MessageSquare, label: "Mensagens" },
  { icon: TicketIcon, label: "Tickets" },
  { icon: Activity, label: "Agent Runs" },
  { icon: Download, label: "Exportacoes" },
];

type TokenResponse = { access: string; refresh: string };

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "org"}-${Math.random().toString(36).slice(2, 6)}`;
}

function statusTone(status?: string): "neutral" | "green" | "amber" | "red" {
  if (status === "active" || status === "approved" || status === "done" || status === "completed") {
    return "green";
  }
  if (status === "blocked" || status === "rejected" || status === "high") {
    return "red";
  }
  if (
    status === "waiting_approval" ||
    status === "planning" ||
    status === "in_progress" ||
    status === "pending_codex" ||
    status === "pending_claude_code"
  ) {
    return "amber";
  }
  return "neutral";
}

const CLIENT_STATUS_LABELS: Record<string, string> = {
  draft: "Briefing recebido",
  planning: "Plano em elaboração",
  waiting_approval: "Aguardando sua aprovação",
  active: "Em produção",
  blocked: "Ajustes solicitados",
  exported: "Implantado",
};

const CLIENT_STAGE_LABELS: Record<string, string> = {
  todo: "A fazer",
  in_progress: "Em andamento",
  blocked: "Bloqueado",
  done: "Concluído",
};

const CLIENT_PLAN_LABELS: Record<string, string> = {
  waiting_approval: "Aguardando aprovação",
  approved: "Aprovado",
  rejected: "Rejeitado",
  changes_requested: "Ajustes solicitados",
};

function clientLabel(status?: string, map: Record<string, string> = CLIENT_STATUS_LABELS) {
  return (status && map[status]) || status || "—";
}

function clientNextAction(status?: string): { text: string; urgent: boolean } {
  switch (status) {
    case "draft": return { text: "Complete o briefing do seu projeto", urgent: false };
    case "planning": return { text: "Seu plano está sendo elaborado pelo time", urgent: false };
    case "waiting_approval": return { text: "Revise e aprove o escopo do projeto", urgent: true };
    case "active": return { text: "Projeto em produção — acompanhe o roadmap abaixo", urgent: false };
    case "blocked": return { text: "Ajustes em análise pelo time", urgent: false };
    case "exported": return { text: "Projeto implantado — acesse sua entrega abaixo", urgent: false };
    default: return { text: "Entre em contato com o time para mais informações", urgent: false };
  }
}

function sumCosts(agentRuns: AgentRun[]) {
  return agentRuns.reduce((total, run) => total + Number(run.estimated_cost || 0), 0).toFixed(2);
}

function agentState(agentRuns: AgentRun[], skill: string) {
  return agentRuns.some((run) => run.skill === skill) ? "executado" : "pronto";
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function compactJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function promptText(run: AgentRun) {
  const objective = run.input.objective;
  const description = run.input.description;
  if (typeof objective === "string") {
    return objective;
  }
  if (typeof description === "string") {
    return description;
  }
  return compactJson(run.input);
}

function outputText(run: AgentRun) {
  const summary = run.output.summary;
  const handoff = run.output.handoff;
  if (typeof summary === "string") {
    return summary;
  }
  if (typeof handoff === "string") {
    return handoff;
  }
  return compactJson(run.output);
}

function metadataString(message: ProjectMessage, key: string) {
  const value = message.metadata?.[key];
  return typeof value === "string" ? value : "";
}

function metadataStringList(message: ProjectMessage, key: string) {
  const value = message.metadata?.[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function metadataTokenUsage(message: ProjectMessage) {
  const value = message.metadata?.token_usage;
  if (!value || typeof value !== "object") {
    return "";
  }
  const usage = value as Record<string, unknown>;
  const total = usage.total_tokens;
  const source = usage.source;
  if (typeof total !== "number" || typeof source !== "string") {
    return "";
  }
  return `${total} tokens (${source})`;
}

function authErrorMessage(error: unknown, mode: "login" | "register") {
  if (!(error instanceof ApiError)) {
    return "Nao foi possivel conectar ao servidor. Tente novamente.";
  }
  if (error.status === 401) {
    return "Conta nao encontrada ou senha incorreta.";
  }
  if (error.status === 400 && mode === "register") {
    const payload = error.payload;
    if (
      payload &&
      typeof payload === "object" &&
      "email" in payload &&
      String(payload.email).includes("already exists")
    ) {
      return "Este email ja esta cadastrado. Use Login para entrar.";
    }
    return "Nao foi possivel criar a conta. Verifique email, usuario e senha.";
  }
  return "Nao foi possivel autenticar. Verifique os dados e tente novamente.";
}

export default function Home() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedRunner, setSelectedRunner] = useState<AgentRunner>("codex");
  const [pendingDecision, setPendingDecision] = useState<"changes_requested" | "rejected" | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [activeSection, setActiveSection] = useState("Projetos");
  const [runFilter, setRunFilter] = useState({ skill: "", status: "" });
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem(tokenKey) ?? "");
  }, []);

  const authForm = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "", username: "" },
  });
  const orgForm = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: { name: "Minha Software House" },
  });
  const projectForm = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "new_build",
    },
  });
  const importForm = useForm<z.infer<typeof importSchema>>({
    resolver: zodResolver(importSchema),
    defaultValues: { git_url: "", zip_file_name: "" },
  });
  const codexForm = useForm<z.infer<typeof codexSchema>>({
    resolver: zodResolver(codexSchema),
    defaultValues: { objective: "Analise este projeto e proponha o proximo passo operacional." },
  });

  const userQuery = useQuery({
    queryKey: ["users", token],
    queryFn: () => apiRequest<User[]>("/users/", token),
    enabled: Boolean(token),
  });
  const orgsQuery = useQuery({
    queryKey: ["organizations", token],
    queryFn: () => apiRequest<Organization[]>("/organizations/", token),
    enabled: Boolean(token),
  });
  const projectsQuery = useQuery({
    queryKey: ["projects", token],
    queryFn: () => apiRequest<Project[]>("/projects/", token),
    enabled: Boolean(token),
  });
  const plansQuery = useQuery({
    queryKey: ["plans", token],
    queryFn: () => apiRequest<ProjectPlan[]>("/plans/", token),
    enabled: Boolean(token),
  });
  const stagesQuery = useQuery({
    queryKey: ["stages", token],
    queryFn: () => apiRequest<Stage[]>("/stages/", token),
    enabled: Boolean(token),
  });
  const ticketsQuery = useQuery({
    queryKey: ["tickets", token],
    queryFn: () => apiRequest<Ticket[]>("/tickets/", token),
    enabled: Boolean(token),
  });
  const messagesQuery = useQuery({
    queryKey: ["messages", token],
    queryFn: () => apiRequest<ProjectMessage[]>("/messages/", token),
    enabled: Boolean(token),
  });
  const agentRunsQuery = useQuery({
    queryKey: ["agent-runs", token],
    queryFn: () => apiRequest<AgentRun[]>("/agent-runs/", token),
    enabled: Boolean(token),
  });
  const agentRegistryQuery = useQuery({
    queryKey: ["agent-registry", token],
    queryFn: () => apiRequest<AgentRegistry>("/agent-runs/registry/", token),
    enabled: Boolean(token),
  });
  const importsQuery = useQuery({
    queryKey: ["imports", token],
    queryFn: () => apiRequest<ProjectImport[]>("/imports/", token),
    enabled: Boolean(token),
  });
  const assessmentsQuery = useQuery({
    queryKey: ["assessments", token],
    queryFn: () => apiRequest<ProjectAssessment[]>("/assessments/", token),
    enabled: Boolean(token),
  });
  const deploymentsQuery = useQuery({
    queryKey: ["deployments", token],
    queryFn: () => apiRequest<Deployment[]>("/deployments/", token),
    enabled: Boolean(token),
  });
  const approvalsQuery = useQuery({
    queryKey: ["approvals", token],
    queryFn: () => apiRequest<Array<{id: number; project: number; decision: string; comment: string; created_at: string}>>("/approvals/", token),
    enabled: Boolean(token),
  });
  const [qaDeploymentId, setQaDeploymentId] = useState<number | null>(null);
  const qaChecklistQuery = useQuery({
    queryKey: ["qa-checklist", qaDeploymentId, token],
    queryFn: () => apiRequest<QAChecklist>(`/deployments/${qaDeploymentId}/qa-checklist/`, token),
    enabled: Boolean(token) && qaDeploymentId !== null,
  });

  const user = userQuery.data?.[0];
  const isTeam = user?.role === "admin" || user?.role === "staff";
  const organizations = orgsQuery.data ?? [];
  const activeOrg = organizations[0];
  const projects = projectsQuery.data ?? [];
  const allAgentRuns = agentRunsQuery.data ?? [];
  const allTickets = ticketsQuery.data ?? [];
  const allPlans = plansQuery.data ?? [];
  const allAssessments = assessmentsQuery.data ?? [];
  const allDeployments = deploymentsQuery.data ?? [];
  const orgNameById = new Map(organizations.map((org) => [org.id, org.name]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  }, [projects, selectedProjectId]);
  const selectedPlan = (plansQuery.data ?? []).find((plan) => plan.project === selectedProject?.id);
  const projectStages = (stagesQuery.data ?? []).filter((stage) => stage.project === selectedProject?.id);
  const projectTickets = (ticketsQuery.data ?? []).filter((ticket) => ticket.project === selectedProject?.id);
  const projectMessages = (messagesQuery.data ?? []).filter(
    (message) => message.project === selectedProject?.id,
  );
  const projectAgentRuns = (agentRunsQuery.data ?? []).filter(
    (run) => run.project === selectedProject?.id,
  );
  const projectImports = (importsQuery.data ?? []).filter(
    (item) => item.project === selectedProject?.id,
  );
  const projectAssessment = (assessmentsQuery.data ?? []).find(
    (assessment) => assessment.project === selectedProject?.id,
  );
  const selectedDeployment = allDeployments.find(
    (deployment) => deployment.project === selectedProject?.id,
  );

  useEffect(() => {
    if (!selectedProjectId && projects[0]) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    const errors = [
      userQuery.error,
      orgsQuery.error,
      projectsQuery.error,
      plansQuery.error,
      stagesQuery.error,
      ticketsQuery.error,
      messagesQuery.error,
      agentRunsQuery.error,
      agentRegistryQuery.error,
      importsQuery.error,
      assessmentsQuery.error,
      deploymentsQuery.error,
      approvalsQuery.error,
      qaChecklistQuery.error,
    ];
    if (errors.some((error) => String(error?.message ?? error).includes("API 401"))) {
      localStorage.removeItem(tokenKey);
      setToken("");
      setSelectedProjectId(null);
      queryClient.clear();
      setNotice("Sessao expirada. Entre novamente.");
    }
  }, [
    agentRunsQuery.error,
    agentRegistryQuery.error,
    approvalsQuery.error,
    qaChecklistQuery.error,
    assessmentsQuery.error,
    deploymentsQuery.error,
    importsQuery.error,
    messagesQuery.error,
    orgsQuery.error,
    plansQuery.error,
    projectsQuery.error,
    queryClient,
    stagesQuery.error,
    ticketsQuery.error,
    userQuery.error,
  ]);

  const invalidateWorkspace = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["organizations", token] }),
      queryClient.invalidateQueries({ queryKey: ["projects", token] }),
      queryClient.invalidateQueries({ queryKey: ["plans", token] }),
      queryClient.invalidateQueries({ queryKey: ["stages", token] }),
      queryClient.invalidateQueries({ queryKey: ["tickets", token] }),
      queryClient.invalidateQueries({ queryKey: ["messages", token] }),
      queryClient.invalidateQueries({ queryKey: ["agent-runs", token] }),
      queryClient.invalidateQueries({ queryKey: ["agent-registry", token] }),
      queryClient.invalidateQueries({ queryKey: ["imports", token] }),
      queryClient.invalidateQueries({ queryKey: ["assessments", token] }),
      queryClient.invalidateQueries({ queryKey: ["deployments", token] }),
      queryClient.invalidateQueries({ queryKey: ["approvals", token] }),
    ]);
  };

  const authMutation = useMutation({
    mutationFn: async (values: z.infer<typeof authSchema>) => {
      const email = values.email.trim().toLowerCase();
      if (mode === "register") {
        await apiFetch<User>("/auth/register/", {
          method: "POST",
          body: JSON.stringify({
            email,
            username: values.username || email.split("@")[0],
            password: values.password,
          }),
        });
      }
      return apiFetch<TokenResponse>("/auth/token/", {
        method: "POST",
        body: JSON.stringify({ email, password: values.password }),
      });
    },
    onSuccess: (data) => {
      localStorage.setItem(tokenKey, data.access);
      setToken(data.access);
      setNotice(mode === "register" ? "Conta criada. Agora crie sua organizacao." : "Login feito.");
    },
  });

  const createOrgMutation = useMutation({
    mutationFn: (values: z.infer<typeof organizationSchema>) =>
      apiRequest<Organization>("/organizations/", token, {
        method: "POST",
        body: JSON.stringify({ name: values.name, slug: slugify(values.name) }),
      }),
    onSuccess: async () => {
      orgForm.reset({ name: "Minha Software House" });
      setNotice("Organizacao criada. Voce ja pode criar projetos.");
      await invalidateWorkspace();
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: (values: z.infer<typeof projectSchema>) =>
      apiRequest<Project>("/projects/", token, {
        method: "POST",
        body: JSON.stringify({
          organization: activeOrg?.id,
          name: values.name,
          description: values.description,
          type: values.type,
          stack: { frontend: "Next.js", backend: "Django REST Framework" },
        }),
      }),
    onSuccess: async (project) => {
      projectForm.reset({ name: "", description: "", type: "new_build" });
      setSelectedProjectId(project.id);
      setNotice("Projeto criado com plano, roadmap, tickets e AgentRuns.");
      await invalidateWorkspace();
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: () =>
      apiRequest<ProjectMessage>("/messages/", token, {
        method: "POST",
        body: JSON.stringify({ project: selectedProject?.id, body: messageBody }),
      }),
    onSuccess: async () => {
      setMessageBody("");
      setNotice("Alteracao solicitada. O agente refinou o pedido e abriu acompanhamento.");
      await invalidateWorkspace();
    },
  });

  const importMutation = useMutation({
    mutationFn: (values: z.infer<typeof importSchema>) =>
      apiRequest<ProjectImport>("/imports/", token, {
        method: "POST",
        body: JSON.stringify({
          project: selectedProject?.id,
          git_url: values.git_url || "",
          zip_file_name: values.zip_file_name || "",
        }),
      }),
    onSuccess: async () => {
      importForm.reset({ git_url: "", zip_file_name: "" });
      setNotice("Import analisado sem executar codigo.");
      await invalidateWorkspace();
    },
  });

  const codexMutation = useMutation({
    mutationFn: (values: z.infer<typeof codexSchema>) =>
      apiRequest<AgentRun>("/agent-runs/request-agent/", token, {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProject?.id,
          objective: values.objective,
          runner: selectedRunner,
        }),
      }),
    onSuccess: async () => {
      codexForm.reset({
        objective: "Analise este projeto e proponha o proximo passo operacional.",
      });
      const label = selectedRunner === "claude-code" ? "Claude Code" : "Codex";
      setNotice(`Solicitacao enviada para o ${label} local e registrada em AgentRun.`);
      await invalidateWorkspace();
    },
  });

  const resolveCodexMutation = useMutation({
    mutationFn: (values: z.infer<typeof codexSchema>) =>
      apiRequest<AgentRun>("/agent-runs/resolve-project/", token, {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProject?.id,
          objective: values.objective,
          runner: selectedRunner,
        }),
      }),
    onSuccess: async () => {
      codexForm.reset({
        objective: "Analise este projeto e proponha o proximo passo operacional.",
      });
      const label = selectedRunner === "claude-code" ? "Claude Code" : "Codex";
      setNotice(`${label} local resolveu o projeto e criou a fila operacional.`);
      await invalidateWorkspace();
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ decision, comment }: { decision: "approved" | "rejected" | "changes_requested"; comment: string }) =>
      apiRequest("/approvals/", token, {
        method: "POST",
        body: JSON.stringify({
          project: selectedProject?.id,
          plan: selectedPlan?.id,
          decision,
          comment,
        }),
      }),
    onSuccess: async () => {
      setPendingDecision(null);
      setApprovalComment("");
      setNotice("Decisão registrada com sucesso.");
      await invalidateWorkspace();
    },
    onError: () => {
      setNotice("Não foi possível registrar a decisão. Tente novamente.");
    },
  });

  const setDeploymentStatusMutation = useMutation({
    mutationFn: ({ id, status: newStatus }: { id: number; status: string }) =>
      apiRequest<Deployment>(`/deployments/${id}/set-status/`, token, {
        method: "POST",
        body: JSON.stringify({ status: newStatus }),
      }),
    onSuccess: async () => {
      setNotice("Status da implantação atualizado.");
      await invalidateWorkspace();
    },
    onError: () => setNotice("Não foi possível alterar o status."),
  });

  const patchQAChecklistMutation = useMutation({
    mutationFn: (data: Partial<QAChecklist>) =>
      apiRequest<QAChecklist>(`/deployments/${qaDeploymentId}/qa-checklist/`, token, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["qa-checklist", qaDeploymentId, token] });
    },
    onError: () => setNotice("Não foi possível atualizar o checklist."),
  });

  const toggleTicketVisibilityMutation = useMutation({
    mutationFn: ({ id, client_visible }: { id: number; client_visible: boolean }) =>
      apiRequest<Ticket>(`/tickets/${id}/`, token, {
        method: "PATCH",
        body: JSON.stringify({ client_visible }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tickets", token] });
    },
  });

  const logout = () => {
    localStorage.removeItem(tokenKey);
    setToken("");
    setSelectedProjectId(null);
    queryClient.clear();
  };

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-5">
        <section className="w-full max-w-md rounded-md border border-neutral-200 bg-white p-5">
          <div className="mb-6 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            <div>
              <h1 className="text-lg font-semibold">DevForge AI</h1>
              <p className="text-sm text-neutral-500">Entre para acessar seus projetos.</p>
            </div>
          </div>
          <div className="mb-4 grid grid-cols-2 rounded-md border border-neutral-200 p-1">
            <button
              className={`rounded px-3 py-2 text-sm ${mode === "login" ? "bg-neutral-950 text-white" : ""}`}
              onClick={() => {
                authMutation.reset();
                setMode("login");
              }}
              type="button"
            >
              Login
            </button>
            <button
              className={`rounded px-3 py-2 text-sm ${mode === "register" ? "bg-neutral-950 text-white" : ""}`}
              onClick={() => {
                authMutation.reset();
                setMode("register");
              }}
              type="button"
            >
              Criar conta
            </button>
          </div>
          <form className="space-y-3" onSubmit={authForm.handleSubmit((data) => authMutation.mutate(data))}>
            {mode === "register" ? (
              <Input placeholder="Nome de usuario" {...authForm.register("username")} />
            ) : null}
            <Input placeholder="Email" type="email" {...authForm.register("email")} />
            {authForm.formState.errors.email ? (
              <p className="text-sm text-rose-700">Digite um email valido.</p>
            ) : null}
            <Input placeholder="Senha" type="password" {...authForm.register("password")} />
            {authForm.formState.errors.password ? (
              <p className="text-sm text-rose-700">A senha precisa ter pelo menos 8 caracteres.</p>
            ) : null}
            {authMutation.error ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {authErrorMessage(authMutation.error, mode)}
              </p>
            ) : null}
            <Button className="w-full" disabled={authMutation.isPending} type="submit">
              {mode === "register" ? <UserPlus className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {mode === "register" ? "Criar conta" : "Entrar"}
            </Button>
          </form>
          {mode === "login" ? (
            <div className="mt-4 grid gap-2 border-t border-neutral-200 pt-4">
              <p className="text-xs text-neutral-500">Acesso rapido local</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  className="bg-white text-neutral-900"
                  disabled={authMutation.isPending}
                  onClick={() =>
                    authMutation.mutate({
                      email: "admin@devforge.local",
                      password: "devforge123",
                    })
                  }
                  type="button"
                >
                  Admin
                </Button>
                <Button
                  className="bg-white text-neutral-900"
                  disabled={authMutation.isPending}
                  onClick={() =>
                    authMutation.mutate({
                      email: "client@devforge.local",
                      password: "devforge123",
                    })
                  }
                  type="button"
                >
                  Cliente
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  const loading = orgsQuery.isLoading || projectsQuery.isLoading || userQuery.isLoading;

  return (
    <main className="min-h-screen bg-neutral-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-neutral-200 bg-white px-4 py-5 lg:block">
        <div className="mb-8 flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-5 w-5 text-teal-600" />
          DevForge AI
        </div>
        <nav className="space-y-1 text-sm">
          {navItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className={`flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium transition-colors ${
                activeSection === label
                  ? "bg-neutral-950 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
              onClick={() => setActiveSection(label)}
              type="button"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="lg:pl-64">
        <header className="border-b border-neutral-200 bg-white px-5 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="text-sm text-neutral-500">
                {isTeam ? "Todas as organizacoes" : activeOrg?.name ?? "Sem organizacao"}
              </p>
              <h1 className="text-xl font-semibold tracking-normal">
                {isTeam ? "Painel do time" : "Projetos do cliente"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="green">{user?.email ?? "sessao ativa"}</Badge>
              <Button className="bg-white text-neutral-900" onClick={logout} type="button">
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-5 py-5">
          {notice ? (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {notice}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-md border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
              Carregando seu workspace...
            </div>
          ) : null}

          {!loading && !activeOrg ? (
            <form
              className="max-w-xl rounded-md border border-neutral-200 bg-white p-5"
              onSubmit={orgForm.handleSubmit((data) => createOrgMutation.mutate(data))}
            >
              <h2 className="mb-1 font-semibold">Crie sua organizacao</h2>
              <p className="mb-4 text-sm text-neutral-500">
                Seus projetos, agent runs e tickets ficam isolados dentro dela.
              </p>
              <div className="flex gap-2">
                <Input placeholder="Nome da organizacao" {...orgForm.register("name")} />
                <Button disabled={createOrgMutation.isPending} type="submit">
                  <Plus className="h-4 w-4" />
                  Criar
                </Button>
              </div>
            </form>
          ) : null}

          {isTeam && (activeSection === "Dashboard" || activeSection === "Agent Runs") ? (
            <section className="mb-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-5">
                {[
                  ["Organizacoes", String(organizations.length), "tenants"],
                  ["Projetos", String(projects.length), "todos"],
                  ["AgentRuns", String(allAgentRuns.length), "auditados"],
                  ["Pendentes", String(allAgentRuns.filter((run) => run.status === "pending_codex" || run.status === "pending_claude_code").length), "agentes"],
                  ["Implantacoes", String(allDeployments.length), "assinaturas"],
                ].map(([label, value, meta]) => (
                  <div key={label} className="rounded-md border border-neutral-200 bg-white p-4">
                    <p className="text-sm text-neutral-500">{label}</p>
                    <div className="mt-2 flex items-end justify-between">
                      <strong className="text-2xl">{value}</strong>
                      <span className="text-xs text-neutral-500">{meta}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">Monitor de projetos</h2>
                      <p className="text-sm text-neutral-500">
                        Visao completa para acompanhar clientes, status, planos e tickets.
                      </p>
                    </div>
                    <Badge tone="neutral">{projects.length}</Badge>
                  </div>
                  <div className="max-h-96 overflow-auto">
                    <table className="w-full border-separate border-spacing-0 text-left text-sm">
                      <thead className="sticky top-0 bg-white text-xs text-neutral-500">
                        <tr>
                          <th className="border-b border-neutral-200 py-2 pr-3">Projeto</th>
                          <th className="border-b border-neutral-200 py-2 pr-3">Org</th>
                          <th className="border-b border-neutral-200 py-2 pr-3">Status</th>
                          <th className="border-b border-neutral-200 py-2 pr-3">Tickets</th>
                          <th className="border-b border-neutral-200 py-2 pr-3">Runs</th>
                          <th className="border-b border-neutral-200 py-2">Implantacao</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map((project) => {
                          const ticketCount = allTickets.filter((ticket) => ticket.project === project.id).length;
                          const runCount = allAgentRuns.filter((run) => run.project === project.id).length;
                          const deployment = allDeployments.find((item) => item.project === project.id);
                          return (
                            <tr key={project.id}>
                              <td className="border-b border-neutral-100 py-3 pr-3">
                                <button
                                  className="text-left font-medium"
                                  onClick={() => setSelectedProjectId(project.id)}
                                  type="button"
                                >
                                  {project.name}
                                </button>
                                <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
                                  {project.description || "Sem descricao"}
                                </p>
                              </td>
                              <td className="border-b border-neutral-100 py-3 pr-3 text-neutral-600">
                                {orgNameById.get(project.organization) ?? project.organization}
                              </td>
                              <td className="border-b border-neutral-100 py-3 pr-3">
                                <Badge tone={statusTone(project.status)}>{project.status}</Badge>
                              </td>
                              <td className="border-b border-neutral-100 py-3 pr-3">{ticketCount}</td>
                              <td className="border-b border-neutral-100 py-3">{runCount}</td>
                              <td className="border-b border-neutral-100 py-3">
                                {deployment ? (
                                  <a
                                    className="text-xs font-medium text-teal-700 hover:underline"
                                    href={deployment.url}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    abrir
                                  </a>
                                ) : (
                                  <span className="text-xs text-neutral-400">sem URL</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">Prompts e resultados</h2>
                      <p className="text-sm text-neutral-500">
                        Inputs, outputs, logs e custos das execucoes mais recentes.
                      </p>
                    </div>
                    <Badge tone="green">auditavel</Badge>
                  </div>
                  <div className="max-h-96 space-y-3 overflow-auto">
                    {allAgentRuns.slice(0, 12).map((run) => {
                      const project = projectById.get(run.project);
                      return (
                        <div key={run.id} className="rounded-md border border-neutral-200 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{run.skill}</p>
                              <p className="text-xs text-neutral-500">
                                {projectNameById.get(run.project) ?? run.project} ·{" "}
                                {project ? orgNameById.get(project.organization) : "org"}
                              </p>
                            </div>
                            <Badge tone={statusTone(run.status)}>{run.status}</Badge>
                          </div>
                          <div className="grid gap-2 text-xs lg:grid-cols-2">
                            <div>
                              <p className="mb-1 font-medium text-neutral-700">Prompt/Input</p>
                              <pre className="max-h-28 overflow-auto rounded bg-neutral-100 p-2 text-neutral-600">
                                {promptText(run)}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-1 font-medium text-neutral-700">Resultado/Output</p>
                              <pre className="max-h-28 overflow-auto rounded bg-neutral-100 p-2 text-neutral-600">
                                {outputText(run)}
                              </pre>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
                            <span>${run.estimated_cost}</span>
                            {run.logs.slice(0, 2).map((log) => (
                              <span key={log}>{log}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <h2 className="mb-3 font-semibold">Planos</h2>
                  <div className="space-y-2 text-sm">
                    {allPlans.slice(0, 8).map((plan) => (
                      <div key={plan.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{projectNameById.get(plan.project) ?? plan.project}</span>
                        <Badge tone={statusTone(plan.status)}>{plan.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <h2 className="mb-3 font-semibold">Assessments</h2>
                  <div className="space-y-2 text-sm">
                    {allAssessments.slice(0, 8).map((assessment) => (
                      <div key={assessment.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {projectNameById.get(assessment.project) ?? assessment.project}
                        </span>
                        <Badge tone={assessment.score >= 75 ? "green" : "amber"}>
                          {assessment.score}/100
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <h2 className="mb-3 font-semibold">Fila de agentes locais</h2>
                  <div className="space-y-2 text-sm">
                    {allAgentRuns
                      .filter((run) =>
                        run.skill === "codex-local-operator" ||
                        run.skill === "claude-code-local-operator",
                      )
                      .slice(0, 8)
                      .map((run) => (
                        <div key={run.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{projectNameById.get(run.project) ?? run.project}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-neutral-400">
                              {run.skill === "claude-code-local-operator" ? "claude-code" : "codex"}
                            </span>
                            <Badge tone={statusTone(run.status)}>{run.status}</Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <h2 className="mb-3 font-semibold">Implantacoes ativas</h2>
                  <div className="space-y-2 text-sm">
                    {allDeployments.slice(0, 8).map((deployment) => (
                      <div key={deployment.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {projectNameById.get(deployment.project) ?? deployment.project}
                        </span>
                        <a
                          className="text-xs font-medium text-teal-700 hover:underline"
                          href={deployment.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          abrir
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* Admin — Team queue (Dashboard only) */}
          {isTeam && activeSection === "Dashboard" ? (() => {
            const waitingApproval = projects.filter(p => p.status === "waiting_approval");
            const pendingRuns = allAgentRuns.filter(r => r.status === "pending_codex" || r.status === "pending_claude_code");
            const failedDeployments = allDeployments.filter(d => d.status === "failed");
            const highTickets = allTickets.filter(t => t.priority === "high" && t.status !== "resolved");
            const queueItems = [
              ...waitingApproval.map(p => ({ type: "approval", label: `${p.name} aguarda aprovação`, projectId: p.id, tone: "amber" as const })),
              ...pendingRuns.map(r => ({ type: "agent", label: `${projectNameById.get(r.project) ?? "Projeto"} — ${r.skill} pendente`, projectId: r.project, tone: "amber" as const })),
              ...failedDeployments.map(d => ({ type: "deployment", label: `Implantação falhou: ${projectNameById.get(d.project) ?? "Projeto"}`, projectId: d.project, tone: "red" as const })),
              ...highTickets.slice(0, 3).map(t => ({ type: "ticket", label: `Alta prioridade: ${t.title}`, projectId: t.project, tone: "red" as const })),
            ];
            if (queueItems.length === 0) return null;
            return (
              <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-amber-900">Fila de atenção</h2>
                  <Badge tone="amber">{queueItems.length} itens</Badge>
                </div>
                <div className="space-y-2">
                  {queueItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm">
                      <span className={item.tone === "red" ? "text-rose-700" : "text-amber-800"}>{item.label}</span>
                      <button
                        className="text-xs font-medium text-neutral-500 underline"
                        onClick={() => { setSelectedProjectId(item.projectId); setActiveSection("Projetos"); }}
                        type="button"
                      >
                        Ver projeto
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })() : null}

          {/* Admin — Agent Runs monitor */}
          {isTeam && activeSection === "Agent Runs" ? (
            <div className="mb-5 space-y-5">
              {/* Token ledger by project */}
              <div className="rounded-md border border-neutral-200 bg-white p-4">
                <h2 className="mb-4 font-semibold">Custo por projeto</h2>
                {(() => {
                  const byProject = new Map<number, { tokens: number; cost: number; runs: number }>();
                  allAgentRuns.forEach(r => {
                    const existing = byProject.get(r.project) ?? { tokens: 0, cost: 0, runs: 0 };
                    byProject.set(r.project, {
                      tokens: existing.tokens + (r.total_tokens ?? 0),
                      cost: existing.cost + Number(r.estimated_cost ?? 0),
                      runs: existing.runs + 1,
                    });
                  });
                  const rows = Array.from(byProject.entries())
                    .sort((a, b) => b[1].cost - a[1].cost)
                    .slice(0, 10);
                  if (rows.length === 0) return <p className="text-sm text-neutral-500">Nenhuma execução registrada.</p>;
                  return (
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs text-neutral-500">
                        <tr>
                          <th className="pb-2 pr-4">Projeto</th>
                          <th className="pb-2 pr-4">Execuções</th>
                          <th className="pb-2 pr-4">Tokens totais</th>
                          <th className="pb-2">Custo estimado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(([projectId, data]) => (
                          <tr key={projectId} className="border-t border-neutral-100">
                            <td className="py-2 pr-4 font-medium">{projectNameById.get(projectId) ?? projectId}</td>
                            <td className="py-2 pr-4 text-neutral-600">{data.runs}</td>
                            <td className="py-2 pr-4 text-neutral-600">{data.tokens.toLocaleString("pt-BR")}</td>
                            <td className="py-2 text-neutral-600">${data.cost.toFixed(4)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* Full agent run monitor with filters */}
              <div className="rounded-md border border-neutral-200 bg-white p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Monitor de execuções</h2>
                    <p className="text-sm text-neutral-500">Inputs, outputs, logs e custos de cada execução.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select
                      className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-xs"
                      value={runFilter.skill}
                      onChange={e => setRunFilter(f => ({ ...f, skill: e.target.value }))}
                    >
                      <option value="">Todos os agentes</option>
                      {Array.from(new Set(allAgentRuns.map(r => r.skill))).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-xs"
                      value={runFilter.status}
                      onChange={e => setRunFilter(f => ({ ...f, status: e.target.value }))}
                    >
                      <option value="">Todos os status</option>
                      {Array.from(new Set(allAgentRuns.map(r => r.status))).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="max-h-[600px] space-y-3 overflow-auto">
                  {allAgentRuns
                    .filter(r => (!runFilter.skill || r.skill === runFilter.skill) && (!runFilter.status || r.status === runFilter.status))
                    .map(run => {
                      const proj = projectById.get(run.project);
                      const isExpanded = expandedRunId === run.id;
                      return (
                        <div key={run.id} className="rounded-md border border-neutral-200">
                          <button
                            className="flex w-full items-start justify-between gap-3 p-3 text-left"
                            onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                            type="button"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{run.skill}</p>
                              <p className="text-xs text-neutral-500">
                                {projectNameById.get(run.project) ?? run.project}
                                {proj ? ` · ${orgNameById.get(proj.organization) ?? "org"}` : ""}
                                {" · "}
                                {new Date(run.created_at).toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {run.total_tokens > 0 && <span className="text-xs text-neutral-400">{run.total_tokens.toLocaleString("pt-BR")} tok</span>}
                              <span className="text-xs text-neutral-400">${Number(run.estimated_cost).toFixed(4)}</span>
                              <Badge tone={statusTone(run.status)}>{run.status}</Badge>
                            </div>
                          </button>
                          {isExpanded ? (
                            <div className="border-t border-neutral-100 p-3">
                              <div className="grid gap-3 text-xs lg:grid-cols-2">
                                <div>
                                  <p className="mb-1 font-medium text-neutral-700">Input</p>
                                  <pre className="max-h-40 overflow-auto rounded bg-neutral-100 p-2 text-neutral-600 whitespace-pre-wrap">{promptText(run)}</pre>
                                </div>
                                <div>
                                  <p className="mb-1 font-medium text-neutral-700">Output</p>
                                  <pre className="max-h-40 overflow-auto rounded bg-neutral-100 p-2 text-neutral-600 whitespace-pre-wrap">{outputText(run)}</pre>
                                </div>
                              </div>
                              {run.logs.length > 0 && (
                                <div className="mt-2">
                                  <p className="mb-1 text-xs font-medium text-neutral-700">Logs</p>
                                  <div className="space-y-1">
                                    {run.logs.map((log, i) => (
                                      <p key={i} className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-600">{log}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500">
                                <span>Tokens: {run.input_tokens} in / {run.output_tokens} out / {run.total_tokens} total</span>
                                <span>Fonte: {run.token_usage_source}</span>
                                <span>Custo: ${Number(run.estimated_cost).toFixed(6)} {run.currency}</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : null}

          {/* Admin — Deployment management */}
          {isTeam && activeSection === "Exportacoes" ? (
            <div className="mb-5 rounded-md border border-neutral-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Gestão de implantações</h2>
                  <p className="text-sm text-neutral-500">Ative, desative ou marque falhas nas implantações dos clientes.</p>
                </div>
                <Badge tone="neutral">{allDeployments.length}</Badge>
              </div>
              {allDeployments.length === 0 ? (
                <p className="text-sm text-neutral-500">Nenhuma implantação ainda.</p>
              ) : (
                <div className="space-y-3">
                  {allDeployments.map(d => (
                    <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 p-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm">{projectNameById.get(d.project) ?? d.project}</p>
                        <p className="truncate text-xs text-neutral-500">{d.url}</p>
                        {d.notes ? <p className="mt-1 text-xs text-neutral-400">{d.notes}</p> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={d.status === "ready" ? "green" : d.status === "failed" ? "red" : "neutral"}>{d.status}</Badge>
                        {d.status === "ready" ? (
                          <Button
                            className="h-7 bg-white px-2 text-xs text-rose-700"
                            disabled={setDeploymentStatusMutation.isPending}
                            onClick={() => setDeploymentStatusMutation.mutate({ id: d.id, status: "disabled" })}
                            type="button"
                          >
                            Desativar
                          </Button>
                        ) : (
                          <Button
                            className="h-7 px-2 text-xs"
                            disabled={setDeploymentStatusMutation.isPending}
                            onClick={() => setDeploymentStatusMutation.mutate({ id: d.id, status: "ready" })}
                            type="button"
                          >
                            Ativar
                          </Button>
                        )}
                        <button
                          className="text-xs font-medium text-neutral-500 underline"
                          onClick={() => setQaDeploymentId(qaDeploymentId === d.id ? null : d.id)}
                          type="button"
                        >
                          {qaDeploymentId === d.id ? "Fechar QA" : "Ver QA"}
                        </button>
                        <a href={d.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-teal-700 hover:underline">abrir</a>
                      </div>

                      {/* QA Checklist panel */}
                      {qaDeploymentId === d.id ? (() => {
                        const qa = qaChecklistQuery.data;
                        if (!qa) return <div className="mt-3 text-xs text-neutral-400">Carregando checklist...</div>;
                        const items: { key: keyof QAChecklist; label: string; auto: boolean }[] = [
                          { key: "scope_approved", label: "Escopo aprovado pelo cliente", auto: true },
                          { key: "roadmap_completed", label: "Todas as etapas do roadmap concluídas", auto: true },
                          { key: "no_blocking_tickets", label: "Sem tickets críticos em aberto", auto: true },
                          { key: "url_reachable", label: "URL da implantação acessível", auto: false },
                          { key: "client_page_reviewed", label: "Página do cliente revisada", auto: false },
                          { key: "notes_complete", label: "Notas internas documentadas", auto: false },
                        ];
                        return (
                          <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-semibold text-neutral-700">Checklist de QA</p>
                              <Badge tone={qa.is_complete ? "green" : "amber"}>
                                {qa.is_complete ? "Completo" : `${[qa.scope_approved, qa.roadmap_completed, qa.no_blocking_tickets, qa.url_reachable, qa.client_page_reviewed, qa.notes_complete].filter(Boolean).length}/6`}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {items.map(item => {
                                const checked = qa[item.key] as boolean;
                                return (
                                  <label key={item.key} className={`flex cursor-pointer items-center gap-2 text-xs ${item.auto ? "cursor-default" : ""}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={item.auto || patchQAChecklistMutation.isPending}
                                      onChange={item.auto ? undefined : () =>
                                        patchQAChecklistMutation.mutate({ [item.key]: !checked } as Partial<QAChecklist>)
                                      }
                                      className="h-3.5 w-3.5 rounded"
                                    />
                                    <span className={checked ? "text-neutral-800" : "text-neutral-500"}>
                                      {item.label}
                                      {item.auto && <span className="ml-1 text-neutral-400">(auto)</span>}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                            {!qa.is_complete && (
                              <p className="mt-2 text-xs text-amber-700">
                                Complete todos os itens antes de ativar a implantação.
                              </p>
                            )}
                          </div>
                        );
                      })() : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {activeOrg && !isTeam && activeSection === "Dashboard" ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Projetos ativos", value: projects.filter(p => p.status === "active" || p.status === "exported").length, sub: "em andamento" },
                  { label: "Aguardando ação", value: projects.filter(p => p.status === "waiting_approval").length, sub: "precisam de aprovação" },
                  { label: "Implantados", value: projects.filter(p => p.status === "exported").length, sub: "disponíveis" },
                ].map(card => (
                  <div key={card.label} className="rounded-md border border-neutral-200 bg-white p-4">
                    <p className="text-sm text-neutral-500">{card.label}</p>
                    <strong className="mt-1 block text-3xl">{card.value}</strong>
                    <p className="mt-1 text-xs text-neutral-400">{card.sub}</p>
                  </div>
                ))}
              </div>
              {projects.length === 0 ? (
                <div className="rounded-md border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
                  Nenhum projeto ainda. Vá em <button className="font-medium underline" onClick={() => setActiveSection("Projetos")} type="button">Projetos</button> para criar o primeiro.
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map(project => {
                    const deployment = allDeployments.find(d => d.project === project.id);
                    const next = clientNextAction(project.status);
                    return (
                      <div key={project.id} className="rounded-md border border-neutral-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{project.name}</p>
                            <p className={`mt-1 text-sm ${next.urgent ? "font-medium text-amber-700" : "text-neutral-500"}`}>{next.text}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone={statusTone(project.status)}>{clientLabel(project.status)}</Badge>
                            {deployment?.status === "ready" ? (
                              <a href={deployment.url} target="_blank" rel="noreferrer"
                                className="inline-flex h-8 items-center gap-1 rounded-md bg-teal-700 px-3 text-xs font-medium text-white hover:bg-teal-800">
                                Acessar →
                              </a>
                            ) : null}
                            <button
                              className="text-xs text-neutral-500 underline"
                              onClick={() => { setSelectedProjectId(project.id); setActiveSection("Projetos"); }}
                              type="button"
                            >
                              Ver detalhes
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {activeOrg && !(activeSection === "Dashboard" && !isTeam) ? (
            <div className={`grid gap-5 ${["Mensagens", "Tickets", "Exportacoes", "Agent Runs"].includes(activeSection) ? "" : "xl:grid-cols-[1.35fr_0.65fr]"}`}>
              <section className="space-y-5">
                {/* Mini metrics — Dashboard e Projetos */}
                {(activeSection === "Dashboard" || activeSection === "Projetos") ? (
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    ["Projetos", String(projects.length), "privados"],
                    ["Planos", String((plansQuery.data ?? []).length), "gerados"],
                    ["Tickets", String((ticketsQuery.data ?? []).length), "abertos"],
                    ["Agentes locais", String(agentRegistryQuery.data?.agents.length ?? 0), agentRegistryQuery.data?.active_runner ?? "local"],
                  ].map(([label, value, meta]) => (
                    <div key={label} className="rounded-md border border-neutral-200 bg-white p-4">
                      <p className="text-sm text-neutral-500">{label}</p>
                      <div className="mt-2 flex items-end justify-between">
                        <strong className="text-2xl">{value}</strong>
                        <span className="text-xs text-neutral-500">{meta}</span>
                      </div>
                    </div>
                  ))}
                </div>
                ) : null}

                {/* Workforce — Agent Runs e Dashboard admin */}
                {(activeSection === "Agent Runs" || (isTeam && activeSection === "Dashboard")) ? (
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">Forca de trabalho local</h2>
                      <p className="text-sm text-neutral-500">
                        Agentes deterministicos rodando no backend local, sempre auditados em AgentRun.
                      </p>
                    </div>
                    <Badge tone="green">{agentRegistryQuery.data?.active_runner ?? "local"}</Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-4">
                    {(agentRegistryQuery.data?.agents ?? []).map((agent) => {
                      const state = agentState(projectAgentRuns, agent.skill);
                      return (
                        <div key={agent.key} className="rounded-md border border-neutral-200 p-3">
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{agent.name}</p>
                              <p className="mt-1 text-xs text-neutral-500">{agent.skill}</p>
                            </div>
                            <Badge tone={state === "executado" ? "green" : "neutral"}>
                              {state}
                            </Badge>
                          </div>
                          <p className="min-h-12 text-xs text-neutral-600">{agent.role}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500">
                            <span>{agent.runner}</span>
                            <span>{agent.mode}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                ) : null}

                {/* Create form + project list — Projetos e Dashboard */}
                {(activeSection === "Projetos" || activeSection === "Dashboard") ? (
                <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <form
                    className="rounded-md border border-neutral-200 bg-white p-4"
                    onSubmit={projectForm.handleSubmit((data) => createProjectMutation.mutate(data))}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-semibold">Criar projeto</h2>
                      <GitBranch className="h-4 w-4 text-neutral-500" />
                    </div>
                    <div className="space-y-3">
                      <Input placeholder="Nome do projeto" {...projectForm.register("name")} />
                      <textarea
                        className="min-h-24 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
                        placeholder="Descreva o que precisa ser construído"
                        {...projectForm.register("description")}
                      />
                      <select
                        className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm"
                        {...projectForm.register("type")}
                      >
                        <option value="new_build">Novo build</option>
                        <option value="imported_project">Projeto importado</option>
                        <option value="maintenance">Manutencao</option>
                        <option value="audit_only">Apenas auditoria</option>
                      </select>
                      {createProjectMutation.error ? (
                        <p className="text-sm text-rose-700">Nao foi possivel criar o projeto.</p>
                      ) : null}
                      <Button disabled={createProjectMutation.isPending} type="submit">
                        <CheckCircle2 className="h-4 w-4" />
                        Gerar plano
                      </Button>
                    </div>
                  </form>

                  <div className="rounded-md border border-neutral-200 bg-white p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="font-semibold">Meus projetos</h2>
                      <Badge tone="neutral">{projects.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {projects.length === 0 ? (
                        <p className="rounded-md border border-neutral-200 p-3 text-sm text-neutral-500">
                          Nenhum projeto ainda. Crie o primeiro para gerar plano, roadmap e tickets.
                        </p>
                      ) : null}
                      {projects.map((project) => {
                        const next = clientNextAction(project.status);
                        return (
                          <button
                            key={project.id}
                            className={`w-full rounded-md border p-3 text-left transition-colors ${
                              project.id === selectedProject?.id
                                ? "border-neutral-950 bg-neutral-50"
                                : "border-neutral-200 bg-white hover:border-neutral-400"
                            }`}
                            onClick={() => {
                              setSelectedProjectId(project.id);
                              setPendingDecision(null);
                              setApprovalComment("");
                              approveMutation.reset();
                            }}
                            type="button"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <strong className="text-sm">{project.name}</strong>
                              <Badge tone={statusTone(project.status)}>
                                {clientLabel(project.status)}
                              </Badge>
                            </div>
                            <p className={`mt-1.5 text-xs ${next.urgent ? "font-medium text-amber-700" : "text-neutral-500"}`}>
                              {next.text}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                ) : null}

                {/* Project detail — Projetos e Dashboard */}
                {selectedProject && (activeSection === "Projetos" || activeSection === "Dashboard") ? (
                  <>
                    {/* Next action banner */}
                    {(() => {
                      const next = clientNextAction(selectedProject.status);
                      return (
                        <div className={`rounded-md border p-4 ${next.urgent ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"}`}>
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${next.urgent ? "bg-amber-500" : "bg-teal-500"}`} />
                            <p className={`text-sm font-medium ${next.urgent ? "text-amber-800" : "text-neutral-700"}`}>
                              {next.text}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-neutral-500">
                            Status: {clientLabel(selectedProject.status)}
                          </p>
                        </div>
                      );
                    })()}

                    <div className="rounded-md border border-neutral-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-semibold">Roadmap de entrega</h2>
                        <Badge tone={statusTone(selectedPlan?.status)}>
                          {clientLabel(selectedPlan?.status, CLIENT_PLAN_LABELS)}
                        </Badge>
                      </div>
                      {projectStages.length === 0 ? (
                        <p className="text-sm text-neutral-500">Nenhuma etapa ainda. Gere um plano para ver o roadmap.</p>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-4">
                          {projectStages.map((stage) => (
                            <div key={stage.id} className="rounded-md border border-neutral-200 p-3">
                              <div className="mb-3 flex items-center justify-between">
                                <span className="text-sm font-medium">{stage.name}</span>
                                <Clock3 className="h-4 w-4 text-neutral-400" />
                              </div>
                              <Badge tone={statusTone(stage.status)}>
                                {clientLabel(stage.status, CLIENT_STAGE_LABELS)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-md border border-neutral-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h2 className="font-semibold">Plano gerado</h2>
                          {selectedPlan?.version && selectedPlan.version > 1 ? (
                            <p className="mt-0.5 text-xs text-neutral-400">versão {selectedPlan.version}</p>
                          ) : null}
                        </div>
                        {selectedPlan ? (
                          <div className="flex items-center gap-2">
                            {selectedPlan.version > 1 && (
                              <Badge tone="neutral">v{selectedPlan.version}</Badge>
                            )}
                            <Badge tone={statusTone(selectedPlan.status)}>
                              {clientLabel(selectedPlan.status, CLIENT_PLAN_LABELS)}
                            </Badge>
                          </div>
                        ) : null}
                      </div>
                      {selectedPlan ? (
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-sm font-medium">Resumo do escopo</p>
                              <p className="mt-1 text-sm text-neutral-600">{selectedPlan.summary}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Riscos identificados</p>
                              <ul className="mt-1 space-y-1 text-sm text-neutral-600">
                                {selectedPlan.risks.map((risk) => (
                                  <li key={risk} className="flex gap-1.5">
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                    {risk}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {pendingDecision ? (
                            <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4 space-y-3">
                              <p className="text-sm font-medium">
                                {pendingDecision === "changes_requested"
                                  ? "Descreva quais mudanças você precisa:"
                                  : "Explique o motivo da rejeição:"}
                              </p>
                              <textarea
                                className="min-h-20 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
                                placeholder="Escreva seu comentário aqui..."
                                value={approvalComment}
                                onChange={(e) => setApprovalComment(e.target.value)}
                              />
                              {approveMutation.error ? (
                                <p className="text-sm text-rose-700">
                                  {String((approveMutation.error as {payload?: {comment?: string[]}})?.payload?.comment?.[0] ?? "Não foi possível registrar a decisão.")}
                                </p>
                              ) : null}
                              <div className="flex gap-2">
                                <Button
                                  disabled={approveMutation.isPending || !approvalComment.trim() || !selectedProject || !selectedPlan}
                                  onClick={() => approveMutation.mutate({ decision: pendingDecision!, comment: approvalComment })}
                                  type="button"
                                >
                                  Confirmar
                                </Button>
                                <Button
                                  className="bg-white text-neutral-900"
                                  onClick={() => { setPendingDecision(null); setApprovalComment(""); approveMutation.reset(); }}
                                  type="button"
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                disabled={approveMutation.isPending || !selectedProject || !selectedPlan}
                                onClick={() => approveMutation.mutate({ decision: "approved", comment: "" })}
                                type="button"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                Aprovar escopo
                              </Button>
                              <Button
                                className="bg-white text-neutral-900"
                                disabled={approveMutation.isPending || !selectedProject || !selectedPlan}
                                onClick={() => { setPendingDecision("changes_requested"); setApprovalComment(""); approveMutation.reset(); }}
                                type="button"
                              >
                                Solicitar mudanças
                              </Button>
                              <Button
                                className="bg-white text-neutral-900"
                                disabled={approveMutation.isPending || !selectedProject || !selectedPlan}
                                onClick={() => { setPendingDecision("rejected"); setApprovalComment(""); approveMutation.reset(); }}
                                type="button"
                              >
                                Rejeitar escopo
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500">Nenhum plano encontrado para este projeto.</p>
                      )}
                    </div>

                    {/* Deployment card — prominent */}
                    <div className={`rounded-md border p-4 ${selectedDeployment?.status === "ready" ? "border-teal-300 bg-teal-50" : "border-neutral-200 bg-white"}`}>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <h2 className="font-semibold">Sua entrega</h2>
                          <p className="text-sm text-neutral-500">
                            Acesse o projeto implantado pela sua assinatura.
                          </p>
                        </div>
                        <Badge tone={selectedDeployment?.status === "ready" ? "green" : "neutral"}>
                          {selectedDeployment?.status === "ready" ? "Disponível" : selectedDeployment?.status === "failed" ? "Falha" : "Aguardando"}
                        </Badge>
                      </div>
                      {selectedDeployment?.status === "ready" ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex-1 rounded-md border border-teal-200 bg-white px-3 py-2 text-sm font-mono text-teal-800 truncate">
                            {selectedDeployment.url}
                          </span>
                          <a
                            className="inline-flex h-9 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-medium text-white transition hover:bg-teal-800"
                            href={selectedDeployment.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Acessar projeto →
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500">
                          A URL estará disponível após a conclusão das etapas de entrega.
                        </p>
                      )}
                    </div>

                    {/* Subscription card — placeholder until Phase 4 subscription model */}
                    <div className="rounded-md border border-neutral-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h2 className="font-semibold">Assinatura</h2>
                        <Badge tone="neutral">Em breve</Badge>
                      </div>
                      <p className="text-sm text-neutral-500">
                        Os detalhes da sua assinatura, plano e limites de alterações estarão disponíveis em breve. Entre em contato com o time para informações sobre o seu plano atual.
                      </p>
                    </div>

                    {/* Project timeline */}
                    {(() => {
                      const projectApprovals = (approvalsQuery.data ?? []).filter(a => a.project === selectedProject.id);
                      const projectMessages = (messagesQuery.data ?? []).filter(m => m.project === selectedProject.id);
                      type TimelineEntry = { date: string; label: string; tone: "green" | "amber" | "neutral" | "red" };
                      const events: TimelineEntry[] = [];
                      if (selectedProject.created_at) events.push({ date: selectedProject.created_at, label: "Projeto criado", tone: "neutral" });
                      if (selectedPlan?.created_at) events.push({ date: selectedPlan.created_at, label: "Plano gerado pelo time", tone: "neutral" });
                      projectApprovals.forEach(a => events.push({
                        date: a.created_at,
                        label: a.decision === "approved" ? "Escopo aprovado" : a.decision === "rejected" ? "Escopo rejeitado" : "Mudanças solicitadas",
                        tone: a.decision === "approved" ? "green" : a.decision === "rejected" ? "red" : "amber",
                      }));
                      projectMessages.filter(m => m.sender === "agent").forEach(m => events.push({ date: m.created_at, label: "Atualização do time", tone: "neutral" }));
                      if (selectedDeployment?.status === "ready") events.push({ date: selectedDeployment.created_at, label: "Projeto implantado", tone: "green" });
                      events.sort((a, b) => a.date < b.date ? -1 : 1);
                      if (events.length === 0) return null;
                      return (
                        <div className="rounded-md border border-neutral-200 bg-white p-4">
                          <h2 className="mb-4 font-semibold">Histórico de entregas</h2>
                          <ol className="relative border-l border-neutral-200 space-y-4 ml-3">
                            {events.map((ev) => (
                              <li key={ev.date + ev.label} className="ml-4">
                                <div className={`absolute -left-1.5 h-3 w-3 rounded-full border-2 border-white ${ev.tone === "green" ? "bg-teal-500" : ev.tone === "amber" ? "bg-amber-400" : ev.tone === "red" ? "bg-rose-500" : "bg-neutral-400"}`} />
                                <p className="text-sm font-medium text-neutral-800">{ev.label}</p>
                                <p className="text-xs text-neutral-400">{new Date(ev.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                              </li>
                            ))}
                          </ol>
                        </div>
                      );
                    })()}

                  </>
                ) : null}

                {/* Imports — Exportacoes section */}
                {selectedProject && activeSection === "Exportacoes" ? (
                    <div className="rounded-md border border-neutral-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-semibold">Importacao segura</h2>
                        <UploadCloud className="h-4 w-4 text-neutral-500" />
                      </div>
                      <form
                        className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                        onSubmit={importForm.handleSubmit((data) => importMutation.mutate(data))}
                      >
                        <Input placeholder="URL Git" {...importForm.register("git_url")} />
                        <Input placeholder="Nome do ZIP" {...importForm.register("zip_file_name")} />
                        <Button disabled={importMutation.isPending} type="submit">
                          Analisar
                        </Button>
                      </form>
                      <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        O MVP registra assessment sem executar codigo importado.
                      </p>
                      {projectImports.length ? (
                        <div className="mt-3 text-sm text-neutral-600">
                          Imports: {projectImports.length}. Assessment:{" "}
                          {projectAssessment ? `${projectAssessment.score}/100` : "processando"}
                        </div>
                      ) : null}
                    </div>

                ) : null}

                {/* Agent panel — Agent Runs section */}
                {selectedProject && activeSection === "Agent Runs" ? (
                    <div className="rounded-md border border-neutral-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h2 className="font-semibold">Acionar agente local</h2>
                          <p className="text-sm text-neutral-500">
                            Cria um AgentRun pendente para o agente atuar neste workspace.
                          </p>
                        </div>
                        <Badge tone="amber">human-in-loop</Badge>
                      </div>

                      <div className="mb-4 flex gap-2">
                        {(["codex", "claude-code"] as AgentRunner[]).map((runner) => (
                          <button
                            key={runner}
                            type="button"
                            onClick={() => setSelectedRunner(runner)}
                            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                              selectedRunner === runner
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
                            }`}
                          >
                            {runner === "codex" ? "Codex" : "Claude Code"}
                          </button>
                        ))}
                      </div>

                      <form
                        className="space-y-3"
                        onSubmit={codexForm.handleSubmit((data) => codexMutation.mutate(data))}
                      >
                        <textarea
                          className="min-h-24 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
                          placeholder={`O que o ${selectedRunner === "claude-code" ? "Claude Code" : "Codex"} deve fazer neste projeto?`}
                          {...codexForm.register("objective")}
                        />
                        {codexMutation.error || resolveCodexMutation.error ? (
                          <p className="text-sm text-rose-700">
                            Nao foi possivel acionar o agente local.
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Button disabled={!selectedProject || codexMutation.isPending} type="submit">
                            <Activity className="h-4 w-4" />
                            Criar handoff
                          </Button>
                          <Button
                            className="bg-white text-neutral-900"
                            disabled={!selectedProject || resolveCodexMutation.isPending}
                            onClick={codexForm.handleSubmit((data) =>
                              resolveCodexMutation.mutate(data),
                            )}
                            type="button"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Resolver agora
                          </Button>
                        </div>
                      </form>
                    </div>
                ) : null}
              </section>

              {/* Right column — only visible on relevant sections */}
              {["Mensagens", "Tickets", "Projetos", "Dashboard"].includes(activeSection) ? (
              <section className="space-y-5">
                {(activeSection === "Mensagens" || activeSection === "Projetos" || activeSection === "Dashboard") ? (
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <div className="mb-4">
                    <h2 className="font-semibold">Solicitar alteracoes</h2>
                    <p className="text-sm text-neutral-500">
                      Escreva do seu jeito. O agente refina o pedido para virar prompt, perguntas e ticket acionavel.
                    </p>
                  </div>
                  <div className="mb-3 max-h-64 space-y-3 overflow-auto text-sm">
                    {projectMessages.length === 0 ? (
                      <p className="rounded-md bg-neutral-100 p-3 text-neutral-500">
                        Nenhuma mensagem ainda.
                      </p>
                    ) : null}
                    {projectMessages.map((message) => {
                      const refinedPrompt = metadataString(message, "refined_prompt");
                      const questions = metadataStringList(message, "clarification_questions");
                      const intent = metadataString(message, "intent");
                      const priority = metadataString(message, "priority");
                      const tokenUsage = metadataTokenUsage(message);
                      return (
                        <div
                          key={message.id}
                          className={`rounded-md p-3 ${
                            message.sender === "agent"
                              ? "bg-teal-50 text-teal-900"
                              : "bg-neutral-100 text-neutral-800"
                          }`}
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge tone={message.sender === "agent" ? "green" : "neutral"}>
                              {message.sender === "agent" ? "agente" : "cliente"}
                            </Badge>
                            {isTeam && intent ? <Badge tone="neutral">{intent}</Badge> : null}
                            {isTeam && priority ? <Badge tone={statusTone(priority)}>{priority}</Badge> : null}
                            {isTeam && tokenUsage ? (
                              <span className="text-xs text-neutral-500">{tokenUsage}</span>
                            ) : null}
                          </div>
                          <p>{message.body}</p>
                          {isTeam && refinedPrompt ? (
                            <div className="mt-3 rounded-md border border-teal-200 bg-white p-3">
                              <p className="mb-1 text-xs font-medium uppercase text-teal-700">
                                Prompt operacional refinado
                              </p>
                              <p className="text-sm text-neutral-700">{refinedPrompt}</p>
                            </div>
                          ) : null}
                          {questions.length > 0 ? (
                            <div className="mt-3 rounded-md border border-neutral-200 bg-white p-3">
                              <p className="mb-2 text-xs font-medium uppercase text-neutral-500">
                                Perguntas para acertividade
                              </p>
                              <ul className="space-y-1 text-sm text-neutral-700">
                                {questions.map((question) => (
                                  <li key={question}>{question}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid gap-2">
                    <textarea
                      className="min-h-24 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
                      disabled={!selectedProject}
                      onChange={(event) => setMessageBody(event.target.value)}
                      placeholder="Ex: quero alterar o financeiro, adicionar novo relatorio, mudar uma regra, corrigir algo que ficou diferente..."
                      value={messageBody}
                    />
                    <Button
                      className="justify-self-end"
                      disabled={!selectedProject || !messageBody.trim() || sendMessageMutation.isPending}
                      onClick={() => sendMessageMutation.mutate()}
                      type="button"
                    >
                      Solicitar alteracao
                    </Button>
                  </div>
                </div>
                ) : null}

                {(activeSection === "Tickets" || activeSection === "Projetos" || activeSection === "Dashboard") ? (
                <>
                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <h2 className="mb-4 font-semibold">Tickets</h2>
                  <div className="space-y-3">
                    {projectTickets.length === 0 ? (
                      <p className="text-sm text-neutral-500">Nenhum ticket neste projeto.</p>
                    ) : null}
                    {projectTickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-md border border-neutral-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{ticket.title}</p>
                          <div className="flex items-center gap-2">
                            {isTeam && (
                              <button
                                className={`rounded px-1.5 py-0.5 text-xs ${ticket.client_visible ? "bg-teal-50 text-teal-700" : "bg-neutral-100 text-neutral-500"}`}
                                disabled={toggleTicketVisibilityMutation.isPending}
                                onClick={() => toggleTicketVisibilityMutation.mutate({ id: ticket.id, client_visible: !ticket.client_visible })}
                                title={ticket.client_visible ? "Visível ao cliente — clique para ocultar" : "Oculto do cliente — clique para mostrar"}
                                type="button"
                              >
                                {ticket.client_visible ? "visível" : "oculto"}
                              </button>
                            )}
                            <Badge tone={statusTone(ticket.priority)}>{ticket.priority}</Badge>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-neutral-500">
                          {ticket.status} · {ticket.source}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">Execucoes auditadas</h2>
                      <p className="text-sm text-neutral-500">
                        Cada decisao importante do agente local fica rastreavel.
                      </p>
                    </div>
                    <Badge tone="neutral">${sumCosts(projectAgentRuns)}</Badge>
                  </div>
                  <div className="space-y-3">
                    {projectAgentRuns.length === 0 ? (
                      <p className="text-sm text-neutral-500">
                        Crie um projeto ou rode uma importacao para registrar execucoes.
                      </p>
                    ) : null}
                    {projectAgentRuns.map((run) => (
                      <div key={run.id} className="rounded-md border border-neutral-200 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{run.skill}</p>
                          <Badge tone={statusTone(run.status)}>{run.status}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-neutral-500">${run.estimated_cost}</p>
                        <div className="mt-2 space-y-1">
                          {run.logs.map((log) => (
                            <p
                              key={log}
                              className="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-600"
                            >
                              {log}
                            </p>
                          ))}
                        </div>
                        {typeof run.output.summary === "string" ? (
                          <p className="mt-2 text-xs text-neutral-700">{run.output.summary}</p>
                        ) : null}
                        {stringList(run.output.next_actions).length ? (
                          <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                            {stringList(run.output.next_actions).map((action) => (
                              <li key={action}>{action}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <h2 className="mb-4 font-semibold">Assessment</h2>
                  {projectAssessment ? (
                    <div className="space-y-2 text-sm text-neutral-600">
                      <p>Score: {projectAssessment.score}/100</p>
                      <p>Stack: {projectAssessment.stack.join(", ")}</p>
                      <p>{projectAssessment.recommendation}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-500">Nenhum assessment para este projeto.</p>
                  )}
                </div>
                </>
                ) : null}
              </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
