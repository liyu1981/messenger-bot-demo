tmux split-window -v "./node_modules/.bin/webpack --config webpack.config.dev.js --watch"
tmux split-window -v "./node_modules/.bin/node-dev ./bundle/dev/bot.bundle.js"
