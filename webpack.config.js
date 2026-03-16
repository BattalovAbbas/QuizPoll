const path = require('path');
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  target: 'node',
  entry: './index.js',
  devtool: "source-map",
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
  },
  externals: {
    'axios': 'axios',
    'node-telegram-bot-api': 'node-telegram-bot-api',
    'node-html-parser': 'node-html-parser',
    'uuid': 'uuid',
    'https': 'https',
  },
  plugins: [
    new webpack.IgnorePlugin(/^pg-native$/),
    new Dotenv()
  ],
};
