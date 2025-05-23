#!/bin/bash

SCRIPT_NAME='demo.sh'
HELP_MESSAGE=$(cat << EOM
Usage: demo <console|graphic> [-h|--help] [-r|--rebuild]

  View template by running a local server.

Available options:
  -h, --help      Display this help message
  -r, --rebuild   Rebuild templates before running server.
EOM
)

# Write a log message to stdout.
log_message() {
  echo "[$SCRIPT_NAME] $1"
}

# Write an error message to stderr.
log_error() {
  echo "[$SCRIPT_NAME] $1" 1>&2
}

help_message() {
  echo "$HELP_MESSAGE"
}

# ----------
# Yarnballs:
# ----------
YARNBALL_CONSOLE=$(cat << EOF
export default function(mewlix) {
  mewlix.modules.add("main", () => {
    /* Make 'mewlix' object globally available (for testing). */
    globalThis.mewlix = mewlix;

    const console = mewlix.lib['std.console'];
    console.get('run')(x => x);
  });
}
EOF
)

YARNBALL_GRAPHIC=$(cat << EOF
export default function(mewlix) {
  mewlix.modules.add("main", () => {
    /* Make 'mewlix' object globally available (for testing). */
    globalThis.mewlix = mewlix;

    const graphic = mewlix.lib['std.graphic'];
    const std = mewlix.lib['std'];

    function range(n) {
      const output = [];
      for (let i = 0; i < n; i++) {
        output.push(i);
      }
      return output;
    }

    range(10).forEach(x => {
      graphic.get('load_text')('/' + x + '.txt');
    });

    let timer = 0, x = 0, y = 0, textLog = false;
    const init = () => graphic.get('init')(() => {
      if (!textLog) {
        range(10).forEach(x => {
          const contents = graphic.get('get_text')('/' + x + '.txt');
          console.log(x, ':', contents.substring(0, 34) + '...')
        });
        textLog = true;
      }
      timer += graphic.get('delta')();
      if (timer >= 1) {
        timer = 0;
        x = std.get('random_int')(0, 127);
        y = std.get('random_int')(0, 127);
      }
      graphic.get('write')('miaou', x, y);
    });
    init();
  });
}
EOF
)

# ----------
# Options:
# ----------
# Should templates be rebuilt before running?
REBUILD=false

# ------------------------------
# Parse command-line arguments:
# ------------------------------
LONG_OPTIONS='help,rebuild'
SHORT_OPTIONS='hr'

OPTS=$(getopt -o "$SHORT_OPTIONS" -l "$LONG_OPTIONS" -n "$SCRIPT_NAME" -- "$@")
eval set -- "$OPTS"

while true; do
  case "$1" in
    -h | --help)
      help_message
      exit ;;
    -r | --rebuild)
      REBUILD=true
      shift ;;
    --)
      shift
      break ;;
    * )
      break ;;
  esac
done


# ----------------
# Run server:
# ----------------
if [ ! -d './build/test/' ] || [ "$REBUILD" = 'true' ]; then
  log_message 'Building templates...'
  { ./build.sh && ./test.sh --no-run; } || {
    log_error 'Error building templates + tests!'
    exit 1
  }
fi

rm -rf './build/run'
mkdir  './build/run'

SERVER_TARGET=''
LOG_FILE='./build/run/server-log.log'

# Copy yarnball:
case "$1" in
  console)
    cp -r './build/test/console' './build/run/console'
    echo "$YARNBALL_CONSOLE" > './build/run/console/yarnball/yarnball.js'
    SERVER_TARGET='./build/run/console' ;;
  graphic)
    cp -r './build/test/graphic' './build/run/graphic'
    echo "$YARNBALL_GRAPHIC" > './build/run/graphic/yarnball/yarnball.js'
    SERVER_TARGET='./build/run/graphic'

    for NUMBER in $(seq 0 9); do
      npx lorem-ipsum 3 paragraphs > "./build/run/graphic/${NUMBER}.txt"
    done ;;
  *)
    log_error "Invalid template choice: \"$1\"!"
    exit 1 ;;
esac

if [ -n "$SERVER_TARGET" ] && [ -d "$SERVER_TARGET" ]; then
  log_message 'Running server...'
  log_message "Serving directory: \"$SERVER_TARGET\""
  log_message "Server log will be saved to: \"$LOG_FILE\""

  npx http-server "$SERVER_TARGET" -o >"$LOG_FILE" 2>&1
else
  log_error "Invalid target path: \"$SERVER_TARGET\""
  exit 1
fi
