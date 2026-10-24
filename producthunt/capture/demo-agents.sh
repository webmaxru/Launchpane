#!/bin/zsh
# Creates or removes the disposable launch agents used for Product Hunt captures.
#
#   zsh producthunt/capture/demo-agents.sh up     # install and start the demo agents
#   zsh producthunt/capture/demo-agents.sh down   # unload and delete everything it created
#
# Every agent is labelled com.launchpane.demo.*, writes only to /tmp/launchpane-demo,
# and prints output that identifies itself as a demo. Nothing else is touched.
set -euo pipefail

readonly PREFIX="com.launchpane.demo"
readonly WORK="/tmp/launchpane-demo"
readonly AGENTS="$HOME/Library/LaunchAgents"
readonly DOMAIN="gui/$(id -u)"
readonly LABELS=(backup cleanup sync report)

plist() { print -r -- "$AGENTS/$PREFIX.$1.plist" }

write_script() {
  local name=$1 body=$2
  print -r -- "#!/bin/zsh
$body" > "$WORK/$name.sh"
  chmod 755 "$WORK/$name.sh"
}

write_plist() {
  local name=$1 extra=$2
  cat > "$(plist "$name")" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$PREFIX.$name</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>$WORK/$name.sh</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$WORK</string>
  <key>StandardOutPath</key>
  <string>$WORK/$name.out.log</string>
  <key>StandardErrorPath</key>
  <string>$WORK/$name.err.log</string>
$extra
</dict>
</plist>
PLIST
  plutil -lint -s "$(plist "$name")"
}

up() {
  down >/dev/null 2>&1 || true
  mkdir -p "$WORK/projects/notes" "$WORK/projects/photos" "$WORK/projects/site" "$WORK/archive"

  write_script backup 'echo "$(date "+%F %T") demo backup agent started"
echo "$(date "+%F %T") found $(ls -1 projects | wc -l | tr -d " ") demo project folders"
echo "$(date "+%F %T") staying alive until the next scheduled pass"
exec /bin/sleep 86400'
  write_script cleanup 'echo "$(date "+%F %T") demo cleanup pass"
echo "$(date "+%F %T") archive folder checked, nothing to remove"'
  write_script sync 'echo "$(date "+%F %T") demo sync started"
echo "$(date "+%F %T") destination /Volumes/LaunchpaneDemo is not mounted" >&2
exit 1'
  write_script report 'echo "$(date "+%F %T") demo weekly report"'

  write_plist backup '  <key>RunAtLoad</key>
  <true/>'
  write_plist cleanup '  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>3</integer>
    <key>Minute</key>
    <integer>30</integer>
  </dict>'
  write_plist sync '  <key>StartInterval</key>
  <integer>21600</integer>'
  write_plist report '  <key>StartCalendarInterval</key>
  <dict>
    <key>Weekday</key>
    <integer>1</integer>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>'

  for name in backup cleanup sync; do
    launchctl bootstrap "$DOMAIN" "$(plist "$name")"
  done
  launchctl kickstart "$DOMAIN/$PREFIX.cleanup"
  launchctl kickstart "$DOMAIN/$PREFIX.sync"
  launchctl disable "$DOMAIN/$PREFIX.report"
  sleep 2

  local name state
  for name in $LABELS; do
    state=$(launchctl print "$DOMAIN/$PREFIX.$name" 2>/dev/null \
      | awk -F' = ' '/^\tstate = |^\tpid = |last exit code = / {gsub(/^[ \t]+/, "", $1); printf "%s=%s; ", $1, $2}' \
      || true)
    print -r -- "$PREFIX.$name: ${state:-not loaded (disabled)}"
  done
}

down() {
  for name in $LABELS; do
    launchctl bootout "$DOMAIN/$PREFIX.$name" 2>/dev/null || true
    launchctl enable "$DOMAIN/$PREFIX.$name" 2>/dev/null || true
    rm -f "$(plist "$name")"
  done
  rm -rf "$WORK"
  print -r -- "Removed $PREFIX.* agents and $WORK"
}

case "${1:-}" in
  up) up ;;
  down) down ;;
  *) print -u2 "Usage: zsh $0 up|down"; exit 64 ;;
esac
