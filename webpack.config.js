const base = require("./base.webpack.config");
const { merge } = require('webpack-merge');
module.exports = merge(base, {
  experiments: {
    outputModule: true,
  },
  output: {
    path: "C:\\Users\\YAO\\Desktop\\321-manage\\node_modules\\axios-expand\\dist",
    filename: "axios-expand.module.js",
    library: {
      type: "module"
    }
  },
});
// module.exports = merge(base, {
//   mode: "development",
//   output: {
//     library: {
//       name: "AxiosExpand",
//       type: "window",
//     }
//   },
// });