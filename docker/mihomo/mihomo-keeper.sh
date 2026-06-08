#!/bin/sh
# shellcheck shell=ash
set -u

SUBSCRIPTION=${SUBSCRIPTION:-""}
INTERVAL=${INTERVAL:-600}

WORKDIR=/root/.config/mihomo
mkdir -p "$WORKDIR"
cd "$WORKDIR" || exit 1

MIHOMO_PID=""
LAST_SHA=""

log() { echo "[keeper $(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

sha_of() { sha256sum "$1" | awk '{print $1}'; }

[ -f config.yaml ] && LAST_SHA=$(sha_of config.yaml)

# return: 0 config changed; 2 unchanged; 1 fetch/validate error
sync_sub() {
    [ -z "$SUBSCRIPTION" ] && { log "SUBSCRIPTION unset"; return 1; }

    tmp="config.yaml.tmp"

    if ! wget -qO "$tmp" "$SUBSCRIPTION"; then
        rm -f "$tmp"
        log "sub download failed"
        return 1
    fi

    new_sha=$(sha_of "$tmp")

    if [ "$new_sha" = "$LAST_SHA" ] && [ -f config.yaml ]; then
        rm -f "$tmp"
        return 2
    fi

    if ! /mihomo -t -d "$WORKDIR" -f "$tmp" >/dev/null 2>&1; then
        rm -f "$tmp"
        log "sub config invalid, keeping current"
        return 1
    fi

    mv "$tmp" config.yaml
    LAST_SHA="$new_sha"
    log "sub updated ($new_sha)"
    return 0
}

start_mihomo() {
    log "starting mihomo"
    /mihomo -d "$WORKDIR" &
    MIHOMO_PID=$!
}

reload_mihomo() {
    [ -z "$MIHOMO_PID" ] && return 0
    log "reloading mihomo (SIGHUP $MIHOMO_PID)"
    kill -HUP "$MIHOMO_PID" 2>/dev/null || log "SIGHUP failed"
}

stop_mihomo() {
    [ -z "$MIHOMO_PID" ] && return 0
    kill "$MIHOMO_PID" 2>/dev/null
    wait "$MIHOMO_PID" 2>/dev/null
    MIHOMO_PID=""
}

cleanup() {
    stop_mihomo
    exit 0
}
trap cleanup INT TERM

main() {
    sync_sub || true
    start_mihomo

    while true; do
        sleep "$INTERVAL"
        sync_sub && reload_mihomo
    done
}

main
