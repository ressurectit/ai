#!/usr/bin/env bash
# Prepares a universal-demo worktree for validating readme samples of a library.
#
# Usage: setup-demo-worktree.sh [--dry-run] [<library-repo-path>]
#
# 1. finds a clone of ng-universal-demo among siblings of the library repo
#    (clones it as ../universal-demo when none exists)
# 2. creates (or reuses) worktree ../universal-demo-readme-<slug> on branch
#    readme-samples/<slug>, based on origin's default branch
# 3. runs `npm ci` in the worktree when node_modules is missing
# 4. builds the library from its current source, packs it with `npm pack`
#    and installs the tarball into the worktree (--no-save)
#
# Safe to re-run: re-running rebuilds and reinstalls the library (use this after
# changing library source). It never deletes anything.
#
# Prints KEY=value lines at the end (DEMO_REPO, DEMO_WORKTREE, DEMO_BRANCH,
# LIB_NAME, LIB_SLUG, LIB_TARBALL).

set -euo pipefail

DEMO_URL="https://github.com/kukjevov/ng-universal-demo.git"
DRY_RUN=0
LIB_DIR=""

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=1 ;;
        -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
        *) LIB_DIR="$arg" ;;
    esac
done

LIB_DIR="$(cd "${LIB_DIR:-.}" && git rev-parse --show-toplevel)"
PARENT_DIR="$(dirname "$LIB_DIR")"

run()
{
    echo "+ $*" >&2
    if [[ $DRY_RUN -eq 0 ]]; then
        "$@"
    fi
}

log()
{
    echo "[setup-demo-worktree] $*" >&2
}

# ---------- library info ----------
LIB_NAME="$(node -p "require('$LIB_DIR/package.json').name")"
LIB_SLUG="$(echo "$LIB_NAME" | sed -e 's/^@//' -e 's/\//-/g')"
log "library: $LIB_NAME ($LIB_DIR)"

# ---------- find universal-demo clone among siblings ----------
DEMO_REPO=""
for dir in "$PARENT_DIR"/*/; do
    dir="${dir%/}"
    [[ "$dir" == "$LIB_DIR" ]] && continue
    [[ -e "$dir/.git" ]] || continue
    url="$(git -C "$dir" remote get-url origin 2>/dev/null || true)"
    if [[ "$url" == *ng-universal-demo* ]]; then
        # prefer the main clone over linked worktrees
        if [[ -d "$dir/.git" ]]; then
            DEMO_REPO="$dir"
            break
        fi
        [[ -z "$DEMO_REPO" ]] && DEMO_REPO="$dir"
    fi
done

if [[ -z "$DEMO_REPO" ]]; then
    DEMO_REPO="$PARENT_DIR/universal-demo"
    if [[ -e "$DEMO_REPO" ]]; then
        log "ERROR: $DEMO_REPO exists but is not a clone of $DEMO_URL"
        exit 1
    fi
    log "universal-demo not found among siblings, cloning to $DEMO_REPO"
    run git clone "$DEMO_URL" "$DEMO_REPO"
else
    log "found universal-demo: $DEMO_REPO"
fi

# ---------- worktree ----------
DEMO_BRANCH="readme-samples/$LIB_SLUG"
DEMO_WORKTREE=""

if [[ -e "$DEMO_REPO/.git" ]]; then
    run git -C "$DEMO_REPO" fetch origin --quiet

    # reuse an existing worktree for the branch
    DEMO_WORKTREE="$(git -C "$DEMO_REPO" worktree list --porcelain | awk -v b="refs/heads/$DEMO_BRANCH" '
        /^worktree /{wt=substr($0, 10)}
        $0 == "branch " b {print wt; exit}')"
fi

if [[ -n "$DEMO_WORKTREE" ]]; then
    log "reusing worktree $DEMO_WORKTREE (branch $DEMO_BRANCH)"
else
    DEMO_WORKTREE="$PARENT_DIR/universal-demo-readme-$LIB_SLUG"
    if [[ -e "$DEMO_WORKTREE" ]]; then
        log "ERROR: $DEMO_WORKTREE exists but is not a worktree of branch $DEMO_BRANCH"
        exit 1
    fi

    if [[ -e "$DEMO_REPO/.git" ]] && git -C "$DEMO_REPO" show-ref --verify --quiet "refs/heads/$DEMO_BRANCH"; then
        log "branch $DEMO_BRANCH exists, attaching new worktree to it"
        run git -C "$DEMO_REPO" worktree add "$DEMO_WORKTREE" "$DEMO_BRANCH"
    else
        BASE_REF="$(git -C "$DEMO_REPO" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || echo origin/HEAD)"
        log "creating worktree $DEMO_WORKTREE on new branch $DEMO_BRANCH from $BASE_REF"
        run git -C "$DEMO_REPO" worktree add -b "$DEMO_BRANCH" "$DEMO_WORKTREE" "$BASE_REF"
    fi
fi

# ---------- demo dependencies ----------
if [[ ! -d "$DEMO_WORKTREE/node_modules" ]]; then
    log "installing demo dependencies"
    if [[ $DRY_RUN -eq 1 ]]; then
        run npm ci   # in $DEMO_WORKTREE
    else
        (cd "$DEMO_WORKTREE" && run npm ci)
    fi
fi

# ---------- build + pack library ----------
if [[ ! -d "$LIB_DIR/node_modules" ]]; then
    log "installing library dependencies"
    (cd "$LIB_DIR" && run npm ci)
fi

LIB_BUILD_SCRIPT="$(node -p "const s=require('$LIB_DIR/package.json').scripts||{}; s.bundle ? 'bundle' : (s.build ? 'build' : '')")"
if [[ -n "$LIB_BUILD_SCRIPT" ]]; then
    log "building library (npm run $LIB_BUILD_SCRIPT)"
    (cd "$LIB_DIR" && run npm run "$LIB_BUILD_SCRIPT")
fi

if [[ $DRY_RUN -eq 1 ]]; then
    PACK_DIR="/tmp/readme-samples-XXXXXX"
else
    PACK_DIR="$(mktemp -d -t readme-samples-XXXXXX)"
fi
log "packing library into $PACK_DIR"
(cd "$LIB_DIR" && run npm pack --pack-destination "$PACK_DIR" --silent >&2)
LIB_TARBALL="$(ls "$PACK_DIR"/*.tgz 2>/dev/null | head -n1 || true)"
[[ -z "$LIB_TARBALL" ]] && LIB_TARBALL="$PACK_DIR/<tarball>.tgz"

log "installing library tarball into demo worktree"
if [[ $DRY_RUN -eq 1 ]]; then
    run npm install "$LIB_TARBALL" --no-save --legacy-peer-deps   # in $DEMO_WORKTREE
else
    (cd "$DEMO_WORKTREE" && run npm install "$LIB_TARBALL" --no-save --legacy-peer-deps)
fi

# ---------- summary ----------
echo "DEMO_REPO=$DEMO_REPO"
echo "DEMO_WORKTREE=$DEMO_WORKTREE"
echo "DEMO_BRANCH=$DEMO_BRANCH"
echo "LIB_NAME=$LIB_NAME"
echo "LIB_SLUG=$LIB_SLUG"
echo "LIB_TARBALL=$LIB_TARBALL"
