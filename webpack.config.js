// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const appDirectory = path.resolve(__dirname);
const {presets} = require(`${appDirectory}/babel.config.js`);

const babelLoaderConfiguration = {
  test: /\.(js|jsx|ts|tsx)$/,
  // Add every directory that needs to be compiled by Babel during the build.
  include: [
    path.resolve(appDirectory, 'index.web.js'), // Entry point for web
    path.resolve(appDirectory, 'App.tsx'), // Your main App component
    path.resolve(appDirectory, 'src'), // Your source code
    path.resolve(appDirectory, 'node_modules/react-native-vector-icons'), // Example for a specific module
    // Add other simp_modules you want to transpile for web, if any.
    // path.resolve(appDirectory, 'node_modules/another-react-native-module'),
  ],
  exclude: /node_modules\/(?!react-native-vector-icons)/, // Exclude most node_modules, but include specific ones if needed
  use: {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      presets, // Use your existing babel.config.js presets
      plugins: ['react-native-web'], // Important for aliasing react-native to react-native-web
    },
  },
};

const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg)$/,
  use: {
    loader: 'url-loader',
    options: {
      name: '[name].[ext]',
      esModule: false, // Important for compatibility with some image usages
    },
  },
};

module.exports = {
  entry: {
    app: path.join(appDirectory, 'index.web.js'), // Your web entry point
  },
  output: {
    filename: 'bundle.web.js', // Output bundle file name
    path: path.resolve(appDirectory, 'web/dist'), // Output directory
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
    ], // Order of resolution
    alias: {
      'react-native$': 'react-native-web', // Alias react-native to react-native-web
      // You might need to add aliases for specific libraries if they don't work out of the box
      // 'react-native-maps': 'react-native-web-maps', (example if using maps)
    },
  },
  module: {
    rules: [
      babelLoaderConfiguration,
      imageLoaderConfiguration,
      // You can add more loaders here for CSS, fonts, etc. if needed
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(appDirectory, 'web/index.html'), // Path to your HTML template
    }),
  ],
  devServer: {
    static: {
      directory: path.join(appDirectory, 'web/dist'),
    },
    compress: true,
    port: 8080, // Port for the development server
    hot: true, // Enable Hot Module Replacement
  },
  mode: process.env.NODE_ENV || 'development', // Set mode to development or production
};
