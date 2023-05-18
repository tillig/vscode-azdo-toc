// @ts-check

const path = require('path');

/** @type {import('webpack').Configuration} */
const config = {
  target: ['node', 'es2022'],
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
  },
  devtool: 'inline-source-map',
  externals: {
    vscode: 'commonjs vscode',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [{
      test: /\.ts$/,
      exclude: /node_modules/,
      use: [{
        loader: 'ts-loader',
        options: {
          compilerOptions: {
            "module": "es6" // override `tsconfig.json` so that TypeScript emits native JavaScript modules.
          }
        }
      }],
    }],
  },
};

module.exports = config;
