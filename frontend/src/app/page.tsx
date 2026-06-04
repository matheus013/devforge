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
  AgentRun,
  AgentRegistry,
  Deployment,
  Organization,
  Project,
  ProjectAssessment,
  ProjectImport,
  ProjectMessage,
  ProjectPlan,
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
    status === "pending_codex"
  ) {
    return "amber";
  }
  return "neutral";
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
      apiRequest<AgentRun>("/agent-runs/request-codex/", token, {
        method: "POST",
        body: JSON.stringify({
          project_id: selectedProject?.id,
          objective: values.objective,
        }),
      }),
    onSuccess: async () => {
      codexForm.reset({
        objective: "Analise este projeto e proponha o proximo passo operacional.",
      });
      setNotice("Solicitacao enviada para o Codex local e registrada em AgentRun.");
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
        }),
      }),
    onSuccess: async () => {
      codexForm.reset({
        objective: "Analise este projeto e proponha o proximo passo operacional.",
      });
      setNotice("Codex local resolveu o projeto e criou a fila operacional.");
      await invalidateWorkspace();
    },
  });

  const approveMutation = useMutation({
    mutationFn: (decision: "approved" | "rejected" | "changes_requested") =>
      apiRequest("/approvals/", token, {
        method: "POST",
        body: JSON.stringify({
          project: selectedProject?.id,
          plan: selectedPlan?.id,
          decision,
          comment: decision === "changes_requested" ? "Cliente pediu ajustes no plano." : "",
        }),
      }),
    onSuccess: async () => {
      setNotice("Decisao registrada no plano.");
      await invalidateWorkspace();
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
              className="flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-neutral-700 hover:bg-neutral-100"
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

          {isTeam ? (
            <section className="mb-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-5">
                {[
                  ["Organizacoes", String(organizations.length), "tenants"],
                  ["Projetos", String(projects.length), "todos"],
                  ["AgentRuns", String(allAgentRuns.length), "auditados"],
                  ["Pendentes", String(allAgentRuns.filter((run) => run.status === "pending_codex").length), "Codex"],
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
                  <h2 className="mb-3 font-semibold">Fila Codex</h2>
                  <div className="space-y-2 text-sm">
                    {allAgentRuns.filter((run) => run.skill === "codex-local-operator").slice(0, 8).map((run) => (
                      <div key={run.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{projectNameById.get(run.project) ?? run.project}</span>
                        <Badge tone={statusTone(run.status)}>{run.status}</Badge>
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

          {activeOrg ? (
            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <section className="space-y-5">
                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    ["Projetos", String(projects.length), "privados"],
                    ["Planos", String((plansQuery.data ?? []).length), "gerados"],
                    ["Tickets", String((ticketsQuery.data ?? []).length), "abertos"],
                    ["Agentes locais", String(agentRegistryQuery.data?.agents.length ?? 0), "local-codex"],
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

                <div className="rounded-md border border-neutral-200 bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">Forca de trabalho local</h2>
                      <p className="text-sm text-neutral-500">
                        Agentes deterministicos rodando no backend local, sempre auditados em AgentRun.
                      </p>
                    </div>
                    <Badge tone="green">{agentRegistryQuery.data?.mode ?? "local"}</Badge>
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
                            <span>{agent.provider}</span>
                            <span>{agent.mode}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

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
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          className={`w-full rounded-md border p-3 text-left ${
                            project.id === selectedProject?.id
                              ? "border-neutral-950 bg-neutral-50"
                              : "border-neutral-200 bg-white"
                          }`}
                          onClick={() => setSelectedProjectId(project.id)}
                          type="button"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <strong className="text-sm">{project.name}</strong>
                            <Badge tone={statusTone(project.status)}>{project.status}</Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                            {project.description || "Sem descricao"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedProject ? (
                  <>
                    <div className="rounded-md border border-neutral-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-semibold">Roadmap visual</h2>
                        <Badge tone={statusTone(selectedPlan?.status)}>{selectedPlan?.status ?? "sem plano"}</Badge>
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        {projectStages.map((stage) => (
                          <div key={stage.id} className="rounded-md border border-neutral-200 p-3">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-sm font-medium">{stage.name}</span>
                              <Clock3 className="h-4 w-4 text-neutral-400" />
                            </div>
                            <Badge tone={statusTone(stage.status)}>{stage.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-md border border-neutral-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="font-semibold">Plano gerado</h2>
                        {selectedPlan ? <Badge tone={statusTone(selectedPlan.status)}>{selectedPlan.status}</Badge> : null}
                      </div>
                      {selectedPlan ? (
                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <p className="text-sm font-medium">Resumo</p>
                            <p className="mt-1 text-sm text-neutral-600">{selectedPlan.summary}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Riscos</p>
                            <ul className="mt-1 space-y-1 text-sm text-neutral-600">
                              {selectedPlan.risks.map((risk) => (
                                <li key={risk}>{risk}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="flex flex-wrap content-end items-end gap-2">
                            <Button
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate("approved")}
                              type="button"
                            >
                              Aprovar
                            </Button>
                            <Button
                              className="bg-white text-neutral-900"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate("changes_requested")}
                              type="button"
                            >
                              Mudancas
                            </Button>
                            <Button
                              className="bg-white text-neutral-900"
                              disabled={approveMutation.isPending}
                              onClick={() => approveMutation.mutate("rejected")}
                              type="button"
                            >
                              Rejeitar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500">Nenhum plano encontrado.</p>
                      )}
                    </div>

                    <div className="rounded-md border border-neutral-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <div>
                          <h2 className="font-semibold">URL da implantacao</h2>
                          <p className="text-sm text-neutral-500">
                            Projeto + implantacao ficam disponiveis quando a assinatura esta ativa.
                          </p>
                        </div>
                        <Badge tone={selectedDeployment ? "green" : "neutral"}>
                          {selectedDeployment?.status ?? "sem implantacao"}
                        </Badge>
                      </div>
                      {selectedDeployment ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Input readOnly value={selectedDeployment.url} />
                          <a
                            className="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 bg-neutral-950 px-3 text-sm font-medium text-white transition hover:bg-neutral-800"
                            href={selectedDeployment.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Abrir implantacao
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500">
                          Conclua as etapas com o Codex local para publicar a implantacao da assinatura.
                        </p>
                      )}
                    </div>

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

                    <div className="rounded-md border border-neutral-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h2 className="font-semibold">Acionar Codex local</h2>
                          <p className="text-sm text-neutral-500">
                            Cria um AgentRun pendente para eu atuar neste workspace.
                          </p>
                        </div>
                        <Badge tone="amber">human-in-loop</Badge>
                      </div>
                      <form
                        className="space-y-3"
                        onSubmit={codexForm.handleSubmit((data) => codexMutation.mutate(data))}
                      >
                        <textarea
                          className="min-h-24 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
                          placeholder="O que o Codex deve fazer neste projeto?"
                          {...codexForm.register("objective")}
                        />
                        {codexMutation.error || resolveCodexMutation.error ? (
                          <p className="text-sm text-rose-700">
                            Nao foi possivel acionar o Codex local.
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
                  </>
                ) : null}
              </section>

              <section className="space-y-5">
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
                          <Badge tone={statusTone(ticket.priority)}>{ticket.priority}</Badge>
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
              </section>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
