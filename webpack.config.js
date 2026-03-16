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
    'node-telegram-bot-api': 'commonjs node-telegram-bot-api',
    'node-html-parser': 'commonjs node-html-parser',
    'uuid': 'commonjs uuid',
    'axios': 'commonjs axios',
    'https': 'commonjs https'
  },
  plugins: [
    new webpack.IgnorePlugin(/^pg-native$/),
    new Dotenv()
  ],
};
