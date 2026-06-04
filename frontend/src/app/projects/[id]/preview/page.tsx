"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileText,
  HardHat,
  PackageCheck,
  Pause,
  Play,
  ReceiptText,
  RotateCcw,
  Server,
  Terminal,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/services/api";
import type { Project } from "@/types/domain";

const tokenKey = "devforge.access";

type AppView = "dashboard" | "operacao" | "obras" | "financeiro" | "compras" | "diario";
type RuntimeStatus = "running" | "paused" | "restarting";

type Worksite = {
  name: string;
  client: string;
  progress: number;
  budget: number;
  spent: number;
  status: string;
  deadline: string;
};

const worksites: Worksite[] = [
  {
    name: "Residencial Lagoa Azul",
    client: "Almeida Engenharia",
    progress: 68,
    budget: 920000,
    spent: 612800,
    status: "em andamento",
    deadline: "18/08/2026",
  },
  {
    name: "Condominio Jardins",
    client: "Construtora Norte",
    progress: 42,
    budget: 1450000,
    spent: 721300,
    status: "em andamento",
    deadline: "12/11/2026",
  },
  {
    name: "Reforma Clinica Vida",
    client: "Grupo Vida",
    progress: 91,
    budget: 380000,
    spent: 344900,
    status: "revisao",
    deadline: "26/06/2026",
  },
];

const cashflow = [
  { label: "Entradas confirmadas", value: 438000, tone: "green" },
  { label: "Pagamentos pendentes", value: 126400, tone: "amber" },
  { label: "Compras aprovadas", value: 84200, tone: "neutral" },
  { label: "Saldo previsto", value: 227400, tone: "green" },
] as const;

const purchaseRequests = [
  { item: "Cimento CP-II", worksite: "Residencial Lagoa Azul", status: "cotando", value: 18400 },
  { item: "Cabos eletricos", worksite: "Condominio Jardins", status: "aprovada", value: 12750 },
  { item: "Piso porcelanato", worksite: "Reforma Clinica Vida", status: "entregue", value: 22900 },
];

const diaryEntries = [
  {
    date: "04/06/2026",
    worksite: "Residencial Lagoa Azul",
    title: "Concretagem da laje do bloco B",
    note: "Equipe completa, clima seco e recebimento de 42 sacos de cimento.",
  },
  {
    date: "03/06/2026",
    worksite: "Condominio Jardins",
    title: "Instalacoes hidraulicas",
    note: "Pontos revisados no pavimento 2. Uma pendencia aberta para fornecedor.",
  },
  {
    date: "02/06/2026",
    worksite: "Reforma Clinica Vida",
    title: "Checklist final de acabamento",
    note: "Punch list atualizado com 6 itens, 4 ja concluidos.",
  },
];

const initialRuntimeLogs = [
  "[22:18:04] boot: ObraFlow iniciado em ambiente subscription-deployment",
  "[22:18:05] api: conexao com banco local validada",
  "[22:18:07] worker: fila de comprovantes Telegram ativa",
  "[22:18:09] health: /dashboard respondeu 200 em 42ms",
];

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function toneForStatus(status: string): "neutral" | "green" | "amber" | "red" {
  if (["entregue", "revisao", "em andamento"].includes(status)) {
    return "green";
  }
  if (["cotando", "aprovada"].includes(status)) {
    return "amber";
  }
  return "neutral";
}

function runtimeTone(status: RuntimeStatus): "neutral" | "green" | "amber" | "red" {
  if (status === "running") {
    return "green";
  }
  if (status === "restarting") {
    return "amber";
  }
  return "neutral";
}

function runtimeLabel(status: RuntimeStatus) {
  if (status === "running") {
    return "em execucao";
  }
  if (status === "restarting") {
    return "reiniciando";
  }
  return "pausado";
}

function ProtectedDeployment() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-5">
      <section className="rounded-md border border-neutral-200 bg-white p-5">
        <h1 className="font-semibold">Implantacao protegida</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Entre no DevForge AI para acessar a implantacao do projeto.
        </p>
        <Link className="mt-4 inline-flex text-sm font-medium text-teal-700" href="/">
          Ir para login
        </Link>
      </section>
    </main>
  );
}

function GenericDeliveredApp({ project }: { project: Project }) {
  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500">Aplicacao implantada</p>
            <h1 className="text-xl font-semibold">{project.name}</h1>
          </div>
          <Link className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700" href="/">
            <ArrowLeft className="h-4 w-4" />
            DevForge
          </Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-5 lg:grid-cols-3">
        {["Operacao", "Clientes", "Financeiro"].map((label, index) => (
          <div key={label} className="rounded-md border border-neutral-200 bg-white p-5">
            <p className="text-sm text-neutral-500">{label}</p>
            <strong className="mt-3 block text-3xl">{[24, 8, 93][index]}</strong>
            <p className="mt-2 text-sm text-neutral-500">Modulo ativo na implantacao.</p>
          </div>
        ))}
        <div className="rounded-md border border-neutral-200 bg-white p-5 lg:col-span-3">
          <h2 className="font-semibold">Painel principal</h2>
          <p className="mt-2 text-sm text-neutral-600">{project.description}</p>
        </div>
      </section>
    </main>
  );
}

export default function ProjectDeploymentPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [token, setToken] = useState("");
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>("running");
  const [runtimeLogs, setRuntimeLogs] = useState(initialRuntimeLogs);
  const [telegramToken, setTelegramToken] = useState("");

  useEffect(() => {
    setToken(localStorage.getItem(tokenKey) ?? "");
  }, []);

  useEffect(() => {
    if (runtimeStatus !== "restarting") {
      return;
    }
    const timeout = window.setTimeout(() => {
      setRuntimeStatus("running");
      setRuntimeLogs((logs) => [
        `[${new Date().toLocaleTimeString("pt-BR")}] runtime: aplicacao reiniciada com sucesso`,
        ...logs,
      ]);
    }, 1400);
    return () => window.clearTimeout(timeout);
  }, [runtimeStatus]);

  const projectsQuery = useQuery({
    queryKey: ["deployment-projects", token],
    queryFn: () => apiRequest<Project[]>("/projects/", token),
    enabled: Boolean(token),
  });

  const project = (projectsQuery.data ?? []).find((item) => item.id === projectId);
  const projectText = `${project?.name ?? ""} ${project?.description ?? ""}`.toLowerCase();
  const isConstructionProject =
    projectText.includes("obra") || projectText.includes("construtora") || projectText.includes("civil");

  const totals = useMemo(() => {
    const budget = worksites.reduce((total, worksite) => total + worksite.budget, 0);
    const spent = worksites.reduce((total, worksite) => total + worksite.spent, 0);
    const progress = Math.round(
      worksites.reduce((total, worksite) => total + worksite.progress, 0) / worksites.length,
    );
    return { budget, progress, spent };
  }, []);

  if (!token) {
    return <ProtectedDeployment />;
  }

  if (projectsQuery.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-5">
        <div className="rounded-md border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
          Abrindo implantacao...
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-5">
        <div className="rounded-md border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
          Projeto nao encontrado para esta conta.
        </div>
      </main>
    );
  }

  if (!isConstructionProject) {
    return <GenericDeliveredApp project={project} />;
  }

  return (
    <main className="min-h-screen bg-[#f6f7f5] text-neutral-950">
      <header className="border-b border-neutral-200 bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-700 text-white">
              <HardHat className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-neutral-500">ObraFlow</p>
              <h1 className="text-xl font-semibold">Gestao de obras</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="green">implantado</Badge>
            <Badge tone={runtimeTone(runtimeStatus)}>{runtimeLabel(runtimeStatus)}</Badge>
            <Link className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700" href="/">
              <ArrowLeft className="h-4 w-4" />
              DevForge
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-2">
          {[
            ["dashboard", "Dashboard", Building2],
            ["operacao", "Operacao", Server],
            ["obras", "Obras", CalendarDays],
            ["financeiro", "Financeiro", WalletCards],
            ["compras", "Compras", PackageCheck],
            ["diario", "Diario", FileText],
          ].map(([value, label, Icon]) => (
            <button
              key={value as string}
              className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition ${
                activeView === value
                  ? "border-teal-700 bg-white text-teal-800"
                  : "border-transparent text-neutral-600 hover:border-neutral-200 hover:bg-white"
              }`}
              onClick={() => setActiveView(value as AppView)}
              type="button"
            >
              <Icon className="h-4 w-4" />
              {label as string}
            </button>
          ))}
        </aside>

        <section className="space-y-5">
          <div className="rounded-md border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-neutral-500">Execucao da aplicacao</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge tone={runtimeTone(runtimeStatus)}>{runtimeLabel(runtimeStatus)}</Badge>
                  <span className="text-sm text-neutral-500">localhost:3000/projects/{project.id}/deployment</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="bg-white text-neutral-900"
                  disabled={runtimeStatus === "running" || runtimeStatus === "restarting"}
                  onClick={() => {
                    setRuntimeStatus("running");
                    setRuntimeLogs((logs) => [
                      `[${new Date().toLocaleTimeString("pt-BR")}] runtime: aplicacao iniciada pelo usuario`,
                      ...logs,
                    ]);
                  }}
                  type="button"
                >
                  <Play className="h-4 w-4" />
                  Iniciar
                </Button>
                <Button
                  className="bg-white text-neutral-900"
                  disabled={runtimeStatus !== "running"}
                  onClick={() => {
                    setRuntimeStatus("paused");
                    setRuntimeLogs((logs) => [
                      `[${new Date().toLocaleTimeString("pt-BR")}] runtime: aplicacao pausada pelo usuario`,
                      ...logs,
                    ]);
                  }}
                  type="button"
                >
                  <Pause className="h-4 w-4" />
                  Pausar
                </Button>
                <Button
                  disabled={runtimeStatus === "restarting"}
                  onClick={() => {
                    setRuntimeStatus("restarting");
                    setRuntimeLogs((logs) => [
                      `[${new Date().toLocaleTimeString("pt-BR")}] runtime: reinicio solicitado pelo usuario`,
                      ...logs,
                    ]);
                  }}
                  type="button"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reiniciar
                </Button>
              </div>
            </div>
          </div>

          {activeView === "dashboard" ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  ["Obras ativas", String(worksites.length), Building2],
                  ["Avanco medio", `${totals.progress}%`, TrendingUp],
                  ["Orcamento total", money(totals.budget), CreditCard],
                  ["Custo realizado", money(totals.spent), ReceiptText],
                ].map(([label, value, Icon]) => (
                  <div key={label as string} className="rounded-md border border-neutral-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm text-neutral-500">{label as string}</p>
                      <Icon className="h-4 w-4 text-teal-700" />
                    </div>
                    <strong className="mt-3 block text-2xl">{value as string}</strong>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-md border border-neutral-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h2 className="font-semibold">Obras em andamento</h2>
                    <Badge tone="green">tempo real</Badge>
                  </div>
                  <div className="space-y-3">
                    {worksites.map((worksite) => (
                      <div key={worksite.name} className="rounded-md border border-neutral-200 p-3">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{worksite.name}</p>
                            <p className="text-sm text-neutral-500">{worksite.client}</p>
                          </div>
                          <Badge tone={toneForStatus(worksite.status)}>{worksite.status}</Badge>
                        </div>
                        <div className="h-2 rounded-full bg-neutral-100">
                          <div
                            className="h-2 rounded-full bg-teal-700"
                            style={{ width: `${worksite.progress}%` }}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-600">
                          <span>{worksite.progress}% fisico</span>
                          <span>{money(worksite.spent)} gasto</span>
                          <span>Entrega {worksite.deadline}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-neutral-200 bg-white p-5">
                  <h2 className="mb-4 font-semibold">Telegram financeiro</h2>
                  <div className="space-y-3">
                    <Input
                      onChange={(event) => setTelegramToken(event.target.value)}
                      placeholder="Token do bot"
                      value={telegramToken}
                    />
                    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm">
                      <p className="font-medium">Comprovante recebido</p>
                      <p className="mt-1 text-neutral-600">
                        Pagamento de R$ 4.280,00 identificado. Aguardando obra e descricao.
                      </p>
                    </div>
                    <Button type="button">
                      <ClipboardCheck className="h-4 w-4" />
                      Registrar comprovante
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activeView === "operacao" ? (
            <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-5">
                <div className="rounded-md border border-neutral-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h2 className="font-semibold">Estado da execucao</h2>
                    <Badge tone={runtimeTone(runtimeStatus)}>{runtimeLabel(runtimeStatus)}</Badge>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 p-3">
                      <span className="text-neutral-500">Processo web</span>
                      <Badge tone={runtimeStatus === "running" ? "green" : "neutral"}>
                        {runtimeStatus === "running" ? "online" : "offline"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 p-3">
                      <span className="text-neutral-500">Fila Telegram</span>
                      <Badge tone={runtimeStatus === "running" ? "green" : "neutral"}>
                        {runtimeStatus === "running" ? "ativa" : "parada"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 p-3">
                      <span className="text-neutral-500">Ultimo health check</span>
                      <span className="font-medium">{runtimeStatus === "running" ? "200 OK" : "sem resposta"}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-neutral-200 bg-white p-5">
                  <h2 className="mb-4 font-semibold">Acoes operacionais</h2>
                  <div className="grid gap-2">
                    <Button
                      className="justify-start bg-white text-neutral-900"
                      disabled={runtimeStatus === "running" || runtimeStatus === "restarting"}
                      onClick={() => {
                        setRuntimeStatus("running");
                        setRuntimeLogs((logs) => [
                          `[${new Date().toLocaleTimeString("pt-BR")}] runtime: start executado`,
                          ...logs,
                        ]);
                      }}
                      type="button"
                    >
                      <Play className="h-4 w-4" />
                      Iniciar aplicacao
                    </Button>
                    <Button
                      className="justify-start bg-white text-neutral-900"
                      disabled={runtimeStatus !== "running"}
                      onClick={() => {
                        setRuntimeStatus("paused");
                        setRuntimeLogs((logs) => [
                          `[${new Date().toLocaleTimeString("pt-BR")}] runtime: pause executado`,
                          ...logs,
                        ]);
                      }}
                      type="button"
                    >
                      <Pause className="h-4 w-4" />
                      Pausar aplicacao
                    </Button>
                    <Button
                      className="justify-start"
                      disabled={runtimeStatus === "restarting"}
                      onClick={() => {
                        setRuntimeStatus("restarting");
                        setRuntimeLogs((logs) => [
                          `[${new Date().toLocaleTimeString("pt-BR")}] runtime: restart executado`,
                          ...logs,
                        ]);
                      }}
                      type="button"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reiniciar aplicacao
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-neutral-200 bg-neutral-950 p-5 text-white">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-teal-300" />
                    <h2 className="font-semibold">Logs da aplicacao</h2>
                  </div>
                  <Button
                    className="border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"
                    onClick={() =>
                      setRuntimeLogs((logs) => [
                        `[${new Date().toLocaleTimeString("pt-BR")}] health: consulta manual retornou ${
                          runtimeStatus === "running" ? "200 OK" : "aplicacao pausada"
                        }`,
                        ...logs,
                      ])
                    }
                    type="button"
                  >
                    Consultar log
                  </Button>
                </div>
                <pre className="max-h-[420px] overflow-auto rounded-md bg-black p-4 text-xs leading-6 text-teal-100">
                  {runtimeLogs.join("\n")}
                </pre>
              </div>
            </div>
          ) : null}

          {activeView === "obras" ? (
            <div className="rounded-md border border-neutral-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Cadastro de obras</h2>
                <Button type="button">
                  <Building2 className="h-4 w-4" />
                  Nova obra
                </Button>
              </div>
              <div className="overflow-auto">
                <table className="w-full border-separate border-spacing-0 text-left text-sm">
                  <thead className="text-xs text-neutral-500">
                    <tr>
                      <th className="border-b border-neutral-200 py-2 pr-3">Obra</th>
                      <th className="border-b border-neutral-200 py-2 pr-3">Cliente</th>
                      <th className="border-b border-neutral-200 py-2 pr-3">Avanco</th>
                      <th className="border-b border-neutral-200 py-2 pr-3">Custo</th>
                      <th className="border-b border-neutral-200 py-2">Prazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {worksites.map((worksite) => (
                      <tr key={worksite.name}>
                        <td className="border-b border-neutral-100 py-3 pr-3 font-medium">{worksite.name}</td>
                        <td className="border-b border-neutral-100 py-3 pr-3">{worksite.client}</td>
                        <td className="border-b border-neutral-100 py-3 pr-3">{worksite.progress}%</td>
                        <td className="border-b border-neutral-100 py-3 pr-3">{money(worksite.spent)}</td>
                        <td className="border-b border-neutral-100 py-3">{worksite.deadline}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeView === "financeiro" ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {cashflow.map((item) => (
                <div key={item.label} className="rounded-md border border-neutral-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-neutral-500">{item.label}</p>
                    <Badge tone={item.tone}>{item.tone}</Badge>
                  </div>
                  <strong className="mt-3 block text-3xl">{money(item.value)}</strong>
                </div>
              ))}
            </div>
          ) : null}

          {activeView === "compras" ? (
            <div className="rounded-md border border-neutral-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Solicitacoes de compra</h2>
                <Button type="button">
                  <PackageCheck className="h-4 w-4" />
                  Solicitar
                </Button>
              </div>
              <div className="space-y-3">
                {purchaseRequests.map((request) => (
                  <div key={request.item} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-200 p-3">
                    <div>
                      <p className="font-medium">{request.item}</p>
                      <p className="text-sm text-neutral-500">{request.worksite}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{money(request.value)}</span>
                      <Badge tone={toneForStatus(request.status)}>{request.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeView === "diario" ? (
            <div className="rounded-md border border-neutral-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Diario de obra</h2>
                <Button type="button">
                  <FileText className="h-4 w-4" />
                  Novo registro
                </Button>
              </div>
              <div className="space-y-3">
                {diaryEntries.map((entry) => (
                  <div key={`${entry.date}-${entry.title}`} className="rounded-md border border-neutral-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-sm text-neutral-500">{entry.worksite}</p>
                      </div>
                      <Badge tone="neutral">{entry.date}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-neutral-600">{entry.note}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Equipe presente", "18", Users],
              ["Tarefas atrasadas", "4", ClipboardCheck],
              ["Medições pendentes", "7", ReceiptText],
            ].map(([label, value, Icon]) => (
              <div key={label as string} className="rounded-md border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-neutral-500">{label as string}</p>
                  <Icon className="h-4 w-4 text-neutral-500" />
                </div>
                <strong className="mt-3 block text-2xl">{value as string}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
