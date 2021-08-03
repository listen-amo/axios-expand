module.exports = {
  mode: "development",
  entry: "./src/index.js",
  module: {
    rules: [{
      test: /\.js$/,
      use: [{
        loader: "babel-loader",
        options: {
          presets: [[
            '@babel/preset-env', {
              targets: '> 1%',
              useBuiltIns: "usage",
              corejs: 3
            }
          ]]
        }
      }]
    }]
  }
}