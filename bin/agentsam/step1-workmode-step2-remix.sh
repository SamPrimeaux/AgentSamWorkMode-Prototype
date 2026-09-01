#!/usr/bin/env bash
# ============================================================================
# bin/agentsam/step1-workmode-step2-remix.sh
#
# WHAT THIS IS (read this if you forgot why this file exists):
#   Promotes UI/logic from AgentSamWorkMode-Prototype (step 1 / sandbox)
#   into AgentSamRemix (step 2 / reference app) as a clean git-am-able patch.
#   Run it from AgentSamWorkMode-Prototype. It never touches AgentSamRemix's
#   git state directly — it only writes a .patch file into ./patches/, which
#   you then apply the same way as always:
#
#     cd $DEST_REPO
#     git checkout -b cursor/<something>
#     git am patches/<the-file-it-made>.patch
#     npm_config_userconfig=/dev/null npm ci   # global ~/.npmrc allow-scripts
#                                               # conflicts with git-dep prep,
#                                               # see agentsam-sdk notes
#     npm_config_userconfig=/dev/null npm run verify:mcp-bridge
#     npm_config_userconfig=/dev/null npm run build
#     git push -u origin <branch>
#
# USAGE:
#   ./bin/agentsam/step1-workmode-step2-remix.sh list
#       Scans src/ against known WorkMode->Remix path rules and prints what's
#       already landed in AgentSamRemix vs what's still pending. This is the
#       source of truth for "what's left to promote" — don't hand-maintain a
#       list, just run this.
#
#   ./bin/agentsam/step1-workmode-step2-remix.sh patch <path> [<path> ...]
#       Builds a patch for specific files (paths relative to WorkMode repo
#       root, e.g. src/components/workbench/DockerDeployPanel.tsx).
#
#   ./bin/agentsam/step1-workmode-step2-remix.sh patch --pending
#       Builds a patch for everything `list` currently reports as PENDING.
#
# CONFIG (override via env vars if paths ever move):
#   SRC_REPO   = WorkMode-Prototype checkout (default: cwd, must look right)
#   DEST_REPO  = AgentSamRemix checkout (default: ~/AgentSamRemix)
# ============================================================================
set -euo pipefail

SRC_REPO="${SRC_REPO:-$(pwd)}"
DEST_REPO="${DEST_REPO:-$HOME/AgentSamRemix}"
PATCH_DIR="$SRC_REPO/patches"
STAMP="$(date +%Y%m%d-%H%M%S)"

if [[ ! -d "$SRC_REPO/src/components" ]]; then
  echo "ERROR: $SRC_REPO doesn't look like AgentSamWorkMode-Prototype (no src/components)." >&2
  echo "Run this from the WorkMode-Prototype repo root, or set SRC_REPO=/path/to/it" >&2
  exit 1
fi

# ---- path mapping: WorkMode src/ -> Remix app/workmode/ -------------------
# This is the ONLY place that needs updating if the promoted directory
# structure ever changes. Everything else is derived from this.
map_path() {
  local src="$1"
  case "$src" in
    src/App.tsx)                 echo "app/workmode/WorkModePage.tsx" ;;
    src/types.ts)                echo "app/workmode/types.ts" ;;
    src/contexts/*)              echo "app/workmode/context/${src#src/contexts/}" ;;
    src/data/*)                  echo "app/workmode/data/${src#src/data/}" ;;
    src/hooks/*)                 echo "app/workmode/hooks/${src#src/hooks/}" ;;
    src/lib/*)                   echo "app/workmode/lib/${src#src/lib/}" ;;
    src/services/*)              echo "app/workmode/services/${src#src/services/}" ;;
    src/components/*/*)          echo "app/workmode/components/${src#src/components/}" ;;
    src/components/*)            echo "app/workmode/components/${src#src/components/}" ;;
    *)                           echo "" ;;  # unmapped
  esac
}

# All promotable source files (mirrors the directories map_path understands)
all_source_files() {
  {
    [[ -f "$SRC_REPO/src/App.tsx" ]] && echo "src/App.tsx"
    [[ -f "$SRC_REPO/src/types.ts" ]] && echo "src/types.ts"
    find "$SRC_REPO/src/contexts" "$SRC_REPO/src/data" "$SRC_REPO/src/hooks" \
         "$SRC_REPO/src/lib" "$SRC_REPO/src/services" "$SRC_REPO/src/components" \
         -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) 2>/dev/null \
      | sed "s|^$SRC_REPO/||"
  } | sort -u
}

cmd_list() {
  echo "Scanning $SRC_REPO  ->  $DEST_REPO"
  echo ""
  local landed=0 pending=0
  while IFS= read -r src; do
    [[ -z "$src" ]] && continue
    local target
    target="$(map_path "$src")"
    if [[ -z "$target" ]]; then
      printf "  %-60s UNMAPPED (add a rule to map_path)\n" "$src"
      continue
    fi
    if [[ -f "$DEST_REPO/$target" ]]; then
      landed=$((landed+1))
    else
      printf "  PENDING  %-60s -> %s\n" "$src" "$target"
      pending=$((pending+1))
    fi
  done < <(all_source_files)
  echo ""
  echo "landed: $landed   pending: $pending"
}

pending_files() {
  while IFS= read -r src; do
    [[ -z "$src" ]] && continue
    local target
    target="$(map_path "$src")"
    [[ -z "$target" ]] && continue
    [[ -f "$DEST_REPO/$target" ]] || echo "$src"
  done < <(all_source_files)
}

cmd_patch() {
  local files=()
  if [[ "${1:-}" == "--pending" ]]; then
    while IFS= read -r f; do files+=("$f"); done < <(pending_files)
    if [[ ${#files[@]} -eq 0 ]]; then
      echo "Nothing pending — run 'list' to confirm."
      exit 0
    fi
  else
    files=("$@")
  fi

  if [[ ${#files[@]} -eq 0 ]]; then
    echo "Usage: $0 patch <path> [<path> ...]   or   $0 patch --pending" >&2
    exit 1
  fi

  local scratch
  scratch="$(mktemp -d)"
  trap 'rm -rf "$scratch"' RETURN

  local copied=0
  for src in "${files[@]}"; do
    local target
    target="$(map_path "$src")"
    if [[ -z "$target" ]]; then
      echo "SKIP (unmapped): $src" >&2
      continue
    fi
    if [[ ! -f "$SRC_REPO/$src" ]]; then
      echo "SKIP (not found): $src" >&2
      continue
    fi
    mkdir -p "$scratch/$(dirname "$target")"
    cp "$SRC_REPO/$src" "$scratch/$target"
    echo "  + $target"
    copied=$((copied+1))
  done

  if [[ $copied -eq 0 ]]; then
    echo "Nothing copied — nothing to patch." >&2
    exit 1
  fi

  (
    cd "$scratch"
    git init -q
    git add -A
    git -c user.email="agentsam@local" -c user.name="agentsam-promote" \
      commit -q -m "feat(workmode): promote $copied file(s) from WorkMode-Prototype"
  )

  mkdir -p "$PATCH_DIR"
  local out="$PATCH_DIR/workmode-promote-$STAMP.patch"
  (cd "$scratch" && git format-patch -1 --stdout) > "$out"

  echo ""
  echo "Wrote: $out"
  echo ""
  echo "Next:"
  echo "  cd $DEST_REPO"
  echo "  git checkout -b cursor/workmode-promote-$STAMP"
  echo "  git am $out"
  echo "  npm_config_userconfig=/dev/null npm ci"
  echo "  npm_config_userconfig=/dev/null npm run verify:mcp-bridge"
  echo "  npm_config_userconfig=/dev/null npm run build"
  echo "  git push -u origin cursor/workmode-promote-$STAMP"
}

case "${1:-list}" in
  list)  cmd_list ;;
  patch) shift; cmd_patch "$@" ;;
  *)     echo "Usage: $0 {list|patch <paths...>|patch --pending}" >&2; exit 1 ;;
esac
