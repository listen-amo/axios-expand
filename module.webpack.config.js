const base = require("./base.webpack.config");
const { merge } = require('webpack-merge');
module.exports = merge(base, {
  experiments: {
    outputModule: true,
  },
  output: {
    filename: "axios-expand.module.js",
    library: {
      type: "module"
    }
  },
})