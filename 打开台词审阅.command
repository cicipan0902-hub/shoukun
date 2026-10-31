#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  export PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
fi
if ! command -v node >/dev/null 2>&1; then
  echo "未找到 Node.js，请在 Codex 中说：帮我打开台词审阅页。"
  read -r "reply?按回车关闭"
  exit 1
fi
node scripts/dialogue-review/server.mjs
read -r "reply?按回车关闭"
