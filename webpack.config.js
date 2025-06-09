const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack'); // Make sure this is imported

const appDirectory = path.resolve(__dirname);
const {presets} = require(`${appDirectory}/babel.config.js`);

const babelLoaderConfiguration = {
  test: /\.(js|jsx|ts|tsx)$/,
  include: [
    path.resolve(appDirectory, 'index.web.js'),
    path.resolve(appDirectory, 'App.web.tsx'),
    path.resolve(appDirectory, 'src'),
    path.resolve(appDirectory, 'node_modules/react-native-vector-icons'),
    // Ensure Expo modules are included for transpilation
    path.resolve(appDirectory, 'node_modules/expo'),
    path.resolve(appDirectory, 'node_modules/expo-camera'),
    path.resolve(appDirectory, 'node_modules/expo-modules-core'),
    path.resolve(appDirectory, 'node_modules/@expo'),
  ],
  exclude: filepath => {
    return (
      /node_modules/.test(filepath) &&
      !/node_modules\/(react-native-vector-icons|expo|expo-camera|expo-modules-core|@expo)/.test(
        filepath,
      )
    );
  },
  use: {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      presets,
      plugins: ['react-native-web'],
    },
  },
};

const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg)$/,
  use: {
    loader: 'url-loader',
    options: {
      name: '[name].[ext]',
      esModule: false,
    },
  },
};

module.exports = {
  entry: {
    app: path.join(appDirectory, 'index.web.js'),
  },
  output: {
    filename: 'bundle.web.js',
    path: path.resolve(appDirectory, 'web/dist'),
  },
  resolve: {
    extensions: [
      '.web.js',
      '.js',
      '.web.jsx',
      '.jsx',
      '.web.ts',
      '.ts',
      '.web.tsx',
      '.tsx',
    ],
    alias: {
      'react-native$': 'react-native-web',
    },
    // Add fallback for 'process' and 'buffer' if you encounter further issues
    // For many older packages, 'process' might need to be resolved to 'process/browser'
    // or you might need a polyfill for 'buffer'
    fallback: {
      process: require.resolve('process/browser'),
      buffer: require.resolve('buffer/'),
    },
  },
  module: {
    rules: [babelLoaderConfiguration, imageLoaderConfiguration],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(appDirectory, 'web/index.html'),
    }),
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
      // Define the entire process.env object for modules that access it directly
      'process.env': JSON.stringify(process.env), // IMPORTANT: Stringify the entire object
    }),
    // If you explicitly need a global `process` object, you can add this:
    // new webpack.ProvidePlugin({
    //   process: 'process/browser',
    //   Buffer: ['buffer', 'Buffer'],
    // }),
  ],
  devServer: {
    static: {
      directory: path.join(appDirectory, 'web/dist'),
    },
    compress: true,
    port: 8080,
    hot: true,
    allowedHosts: 'all',
  },
  mode: process.env.NODE_ENV || 'development',
};
