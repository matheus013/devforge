#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-devforge_ai}"
DISK_WARNING_GB="${DISK_WARNING_GB:-12}"
COMPOSE=(docker compose -p "$PROJECT_NAME")

cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
DevForge AI - comandos locais

Uso:
  ./devforge.sh install-docker       Instala Docker Desktop via Homebrew Cask
  ./devforge.sh start                Sobe o projeto com Docker Compose
  ./devforge.sh stop                 Para os containers sem apagar dados
  ./devforge.sh restart              Reinicia os containers
  ./devforge.sh status               Mostra containers e uso de disco Docker
  ./devforge.sh clean                Remove containers parados e cache de build
  ./devforge.sh clean --volumes      Remove tambem volumes do projeto (apaga dados locais)
  ./devforge.sh test                 Roda testes/lint/typecheck principais

Variaveis uteis:
  DISK_WARNING_GB=12                 Avisa quando o disco livre estiver abaixo disso
  COMPOSE_PROJECT_NAME=devforge_ai   Nome isolado do projeto no Docker

EOF
}

free_disk_gb() {
  df -g "$ROOT_DIR" | awk 'NR==2 {print $4}'
}

warn_low_disk() {
  local free_gb
  free_gb="$(free_disk_gb)"
  if [[ "$free_gb" =~ ^[0-9]+$ ]] && (( free_gb < DISK_WARNING_GB )); then
    cat <<EOF
Aviso: este Mac tem apenas ${free_gb}GB livres neste volume.
Recomendado: rode './devforge.sh clean' antes/depois do build e limite o disco do
Docker Desktop em Settings > Resources > Advanced > Disk image size.

EOF
  fi
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    cat <<'EOF'
Docker nao encontrado.

Instale com:
  ./devforge.sh install-docker

Depois abra o Docker Desktop uma vez e aguarde ele ficar "running".
EOF
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    cat <<'EOF'
Docker esta instalado, mas o daemon nao respondeu.

No macOS, abra o Docker Desktop e aguarde inicializar. Se quiser tentar abrir:
  open -a Docker
EOF
    exit 1
  fi
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    echo "Docker ja esta instalado: $(command -v docker)"
    return
  fi

  if ! command -v brew >/dev/null 2>&1; then
    cat <<'EOF'
Homebrew nao encontrado. Instale o Docker Desktop manualmente:
  https://www.docker.com/products/docker-desktop/
EOF
    exit 1
  fi

  echo "Instalando Docker Desktop via Homebrew Cask..."
  brew install --cask --no-binaries docker

  cat <<'EOF'

Docker Desktop instalado.

Para economizar espaco no MacBook:
  1. Abra Docker Desktop.
  2. Va em Settings > Resources > Advanced.
  3. Ajuste "Disk image size" para algo pequeno, por exemplo 20GB.
  4. Use './devforge.sh clean' quando terminar de testar.

Tentando abrir o Docker Desktop agora...
EOF
  open -a Docker || true
}

start() {
  warn_low_disk
  require_docker
  echo "Subindo DevForge AI com Docker Compose..."
  DOCKER_BUILDKIT=1 "${COMPOSE[@]}" up --build
}

stop() {
  require_docker
  "${COMPOSE[@]}" down --remove-orphans
}

restart() {
  stop
  start
}

status() {
  require_docker
  "${COMPOSE[@]}" ps
  echo
  docker system df
}

clean() {
  require_docker
  if [[ "${1:-}" == "--volumes" ]]; then
    echo "Removendo containers, rede e volumes do projeto ${PROJECT_NAME}..."
    "${COMPOSE[@]}" down --volumes --remove-orphans
  else
    echo "Removendo containers parados do projeto ${PROJECT_NAME}..."
    "${COMPOSE[@]}" down --remove-orphans
  fi

  echo "Limpando cache de build nao usado..."
  docker builder prune -f
  echo
  docker system df
}

run_tests() {
  require_docker
  "${COMPOSE[@]}" run --rm backend sh -c "USE_SQLITE=1 pytest && ruff check ."
  "${COMPOSE[@]}" run --rm frontend npm run typecheck
}

case "${1:-}" in
  install-docker) install_docker ;;
  start) start ;;
  stop) stop ;;
  restart) restart ;;
  status) status ;;
  clean) shift; clean "${1:-}" ;;
  test) run_tests ;;
  ""|-h|--help|help) usage ;;
  *)
    echo "Comando desconhecido: $1"
    echo
    usage
    exit 1
    ;;
esac
