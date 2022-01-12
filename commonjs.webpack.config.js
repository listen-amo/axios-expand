const base = require("./base.webpack.config");
const { merge } = require('webpack-merge');
module.exports = merge(base, {
  output: {
    library: {
      type: "commonjs"
    }
  },
})