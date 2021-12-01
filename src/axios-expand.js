import Axios from "axios/lib/core/Axios.js";
import {
  merge,
  typeOf,
  errorMsg,
  toUpperCase,
  toLowerCase,
  qs,
  toFormData,
  isValue,
  mergeFieldToArray,
} from "./utils/index.js";

const defaults = {
  responseType: "json",
  requestType: "json",
  pathParam: true,
};

const regCTJson = /application\/json/, // content-type=json
  regPathParam = /(\/):([^\/?#]+)/g;

// 参数需要为数组的字段
const optionsArrayFileds = ["before", "after", "transformInstance"];

function mergeOptions(...args) {
  return merge(...args, mergeFieldToArray(args, optionsArrayFileds));
}

export default class AxiosExpand extends Axios {
  constructor(options) {
    super(mergeOptions(defaults, AxiosExpand.defaults, options));
    this._initApis();
    this._bind();
  }

  static defaults = {};

  _apis = null;
  _cache = null;

  _initApis() {
    let apis = this.defaults.apis;
    this._apis = typeOf(apis, "Object") ? apis : {};
    delete this.defaults.apis;
  }

  _bind() {
    // 现在api方法只是别名
    this.api = this.request = this._request.bind(this);
  }

  /**
   * 基于axios.request方法的二次封装。
   *
   * @param {Object|String} options - 完整请求配置参数或请求的地址。
   * 1. 完整包含axios的原生配置
   * 2. 为String时则为请求配置列表的键。
   * 3. 为String时如果无法找到对应配置则会被视为请求路径
   * 4. 配置有多个来源且会进行合并。可能的来源和合并优先级：AxiosExpand.defaults < AxiosExpand(options) <  apisConfig < api(options)。
   *
   * @param {String} options.api - 请求配置列表的键。
   *
   * @param {*|Function} options.local - 本地数据。
   * 1. 设置此参数后会跳过请求，直接resolve此参数设置的数据。
   * 2. 设置一个函数则返回此函数的调用结果
   *
   * @param {Boolean} options.cache - 启用缓存数据。
   * 1. 此次请求会优先从缓存中查找，没有则正常请求，并存入缓存。
   *
   * @param {Array<Function>|Function} options.before - 选项最终合并完成后，发起请求前的回调函数。
   * 1. 可以用于每次请求前动态的调整各项参数
   * 2. 参数为最终合并完成的 options
   * 3. 可以直接修改options。也可以返回一个新的options。
   * 4. 多个配置来源的参数会自动合并依次调用
   * 5. 可以通过返回 false 来中止请求
   *
   * @param {Function} options.url - 请求路径。新增了路径参数替换功能。
   * 例：
   *  转换前：
   *    路径：/api/data/:id
   *    参数：{ id: 10  }
   *  转换后：
   *    路径：/api/data/10
   *    参数：{  }
   *
   * @param {Function} options.pathParam - 是否开启路径参数替换
   *
   * @param {Function} [options.requestType=json] - 请求类型。默认值：json
   * 1. 会自动设置对应的 Content-Type 请求头类型
   * 2. 会自动格式化对应的数据格式
   * 3. 目前可选值：
   *  json:
   *    Content-Type=application/json
   *    格式处理：json -> 无
   *  form:
   *    Content-Type=multipart/form-data
   *    格式处理：json -> FomrData
   *  form-url:
   *    Content-Type=application/x-www-form-urlencoded
   *    格式处理：json -> queryString
   *
   * @param {Array<Function>|Function} options.after - 请求完成后的回调函数。
   * 1. 参数为响应的 response
   * 2. 可以用于在数据在实际使用前对数据进行处理
   * 3. 可以直接修改 response。也可以返回一个新的 response。
   * 4. 多个配置来源的参数会自动合并依次调用
   *
   * @param {Function} options.errorIntercept - 错误拦截器
   * 1. 用于处理响应正确，但是业务上请求错误的逻辑。
   * 2. 返回一个布尔值，为true表示响应异常。会直接 throw response;
   * 3. 如此产生的错误会在 response 对象上新增一个 $fromErrorIntercept: true 的属性用于判断
   *
   * @param {Array<Function>|Function} options.transformInstance - 实例转换处理函数
   * 1. 参数为原始请求的Promise实例
   * 2. 如果返回了非undfined和null的值，则会用此值生成新的实例替换原本的Promise实例
   * 3. 没有返回值的情况下只会在原本的实例上增加处理函数
   * 4. 多个配置来源的参数会自动合并依次调用
   *
   * @param {*} params - 请求参数（GET请求）或请求数据（POST请求）。
   * 1. 如果是请求参数则会和 options.params 进行合并
   * 2. 如果是请求数据则会判断options.data 和 params 的类型后决定是和合并还是覆盖
   *
   * @param {String} method - 请求方法
   *
   * @returns {Promise}
   */
  _request(options, params, method) {
    options = this.generateOptions(options, params, method);

    // before
    if (options.before.length) {
      for (const handler of options.before) {
        const result = handler(options);
        if (result === false) {
          return Promise.reject({
            msg: "request cancel.",
            $fromRequestCancel: true,
          });
        } else {
          options = typeOf(result, "Object") ? result : options;
        }
      }
    }

    // requestType
    if (options.requestType) {
      options = this._transformData(options);
    }

    // url
    if (options.url) {
      if (options.pathParam) {
        options.url = this._pathParams(options);
      }
    } else {
      errorMsg("options.url is required.");
      return Promise.reject(null);
    }

    let RP, cache;

    // local
    if ("local" in options) {
      RP = Promise.resolve(this._getLocal(options));
    } else if (options.cache && (cache = this._getCache(options))) {
      RP = cache;
    } else {
      RP = super.request(options);
    }

    // cache
    if (options.cache && !cache) {
      this._setCatch(options, RP);
    }

    // json数据转换
    RP = RP.then((res) => {
      if (regCTJson.test(res.headers["content-type"])) {
        try {
          res.data = JSON.parse(res.data);
        } catch (err) {}
      }
      return res;
    });

    // errorIntercept
    if (typeOf(options.errorIntercept, "Function")) {
      RP = RP.then((res) => {
        if (options.errorIntercept(res)) {
          res.$fromErrorIntercept = true;
          throw res;
        }
        return res;
      });
    }

    // transformInstance
    if (options.transformInstance.length) {
      RP = options.transformInstance.reduce(function (promise, handler) {
        let rv = handler(promise);
        if (isValue(rv)) {
          if (!typeOf(rv, "Promise")) {
            rv = Promise.resolve(rv);
          }
        } else {
          rv = promise;
        }
        return rv;
      }, RP);
    }

    // after
    if (options.after.length) {
      RP = RP.then((res) => {
        options.after.forEach(function (handler) {
          res = handler(res) || res;
        });
        return res;
      });
    }

    return RP;
  }

  // 从apis中查找配置
  _getApiOptions(apiName) {
    let apiOptions = this._apis[apiName];
    if (typeOf(apiOptions, "String")) {
      apiOptions = {
        url: apiOptions,
      };
    }
    return apiOptions;
  }

  /**
   * 创建配置
   * 1. 参数和request方法一致
   * 2. 会从配置列表中查找并且合并、转换后得到的最终配置
   * @param {Object|String} options
   * @param {*} params
   * @param {String} method
   * @returns {Object} requestOptions
   */
  generateOptions(options, params, method) {
    let apiOptions;
    if (options) {
      if (typeOf(options, "String")) {
        apiOptions = this._getApiOptions(options);
        if (!apiOptions) {
          options = {
            url: options,
          };
        }
      }
      if (options.api) {
        apiOptions = this._getApiOptions(options.api);
      }
      options = mergeOptions(this.defaults, apiOptions, options);
      options = this._formatRequestOptions(options, params, method);
    }
    return options || {};
  }

  _pathParams({ url, params, data }) {
    if (params || data) {
      url = url.replace(regPathParam, function (rv, $1, $2) {
        let target;
        if (params && $2 in params) {
          target = params;
        } else if (data && $2 in data) {
          target = data;
        }
        if (target) {
          rv = target[$2];
          delete target[$2];
        }
        return $1 + rv;
      });
    }
    return url;
  }

  // 融合 params method 参数到 options
  _formatRequestOptions(options, params, method) {
    if (typeOf(method, "String")) {
      options.method = method;
    }
    if (params) {
      switch (toUpperCase(options.method)) {
        case "POST":
          options.data =
            typeOf(options.data, "Object") && typeOf(params, "Object")
              ? merge(options.data, params)
              : params;
          break;
        default:
          if (typeOf(params, "Object")) {
            options.params = merge(options.params, params);
          }
          break;
      }
    }
    return options;
  }

  // 转换 data 为requestType对应的格式
  _transformData(options) {
    let contentType,
      data = (options.originalData = options.data);
    switch (toLowerCase(options.requestType)) {
      case "form-url":
        contentType = "application/x-www-form-urlencoded;charset=utf-8";
        data = data && qs(data);
        break;
      case "form":
        contentType = "multipart/form-data;charset=utf-8";
        data = data && toFormData(data);
        break;
      case "json":
        contentType = "application/json;charset=utf-8";
        data = data && JSON.stringify(data);
        break;
    }
    if (contentType) {
      options.headers = merge(
        {
          "Content-Type": contentType,
        },
        options.headers,
        false
      );
    }
    if (data) {
      options.data = data;
    }
    return options;
  }

  // 根据options的关键数据生成一个对应的id
  _getOptionsId(options) {
    let { url, params, originalData, method } = options;

    params = {
      ...params,
      ...(typeOf(originalData, "Object") && originalData),
    };

    params = Object.keys(params)
      .sort()
      .map((k) => k + "=" + params[k])
      .join("&");

    if (!method) {
      method = "GET";
    } else {
      method = method.toUpperCase();
    }
    return url + "|" + params + "|" + method;
  }

  _getLocal(options) {
    // 兼容 response 对象
    return {
      data: typeOf(options.local, "Function") ? options.local() : options.local,
      config: options,
      headers: {},
      request: {},
      status: 200,
      statusText: "",
    };
  }

  _getCache(options) {
    return this._cache && this._cache[this._getOptionsId(options)];
  }

  _setCatch(options, res) {
    let cId = this._getOptionsId(options);
    (this._cache || (this._cache = {}))[cId] = res;
  }
}
