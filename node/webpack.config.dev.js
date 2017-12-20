const webpack = require('webpack');
const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: [
    'webpack/hot/poll?1000',
    './bot.js'
  ],
  target: 'node',
  output: {
    path: path.join(__dirname, 'bundle/dev/'),
    filename: 'bot.bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: 'echo-loader'
          },
          {
            loader: 'babel-loader',
            options: {
              presets: ['babel-preset-env'],
              ignore: ['/node_modules/']
            }
          }
        ]
      }
    ]
  },
  externals: [
    nodeExternals({
      whitelist: ['webpack/hot/poll?1000']
    })
  ],
  plugins: [
    new webpack.BannerPlugin({
      banner: 'require("source-map-support").install();',
      raw: true,
      entryOnly: false
    }),
    new webpack.HotModuleReplacementPlugin()
  ],
  devtool: 'source-map'
}
