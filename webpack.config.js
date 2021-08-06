const base = require("./base.webpack.config");
const { merge } = require('webpack-merge');
module.exports = merge(base, {
  mode: "development",
  output: {
    library: {
      name: "AxiosExpand",
      type: "window",
    }
  },
})