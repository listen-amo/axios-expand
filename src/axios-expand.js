import Axios from "axios/lib/core/Axios";
import {
  merge,
  typeOf,
  errorMsg,
  toUpperCase,
  toLowerCase,
  qs,
  toFormData,
  isValue
} from "./utils";

const defaults = {
  responseType: "json",
  requestType: "json",
  pathParamsReg: /:([^\/?#]+)/g
}

export default class AxiosExpand extends Axios {

  constructor(options) {
    super(merge(defaults, AxiosExpand.defaults, options, true));
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
    this.request = this._request.bind(this);
    this.api = this._api.bind(this);
  }

  /**
   * 通过查找请求配置列表发起请求
   * @param {Object|String} options - 请求配置参数
   * 1. 为Object时基本等同 request 的配置参数。唯一新增了一个"api"字段表示请求配置列表的键。
   * 2. 为String时则为请求配置列表的键。
   * 3. 为String时如果请求配置列表中无法找到则尝试把其直接解析为请求路径
   * 
   * @param {String} options.api - 请求配置列表的键。
   * 
   * @param params - 请求参数。等同 request 的 params 参数
   */
  _api(options, params) {
    options = this._formatApiOptions(options);
    if (options) {
      return this._request(options, params);
    } else {
      errorMsg("api \"" + options + "\" is not found.");
    }
  }

  _formatApiOptions(options) {
    let apiOptions;
    if (options) {
      if (typeOf(options, "String")) {
        options = {
          api: options
        };
      }
      apiOptions = this._apis[options.api];
      if (!apiOptions && /\//.test(options.api)) {
        apiOptions = {
          url: options.api
        }
      }
      if (typeOf(apiOptions, "String")) {
        apiOptions = {
          url: apiOptions
        }
      }
      delete options.api;
    }
    return merge(apiOptions, options, true);
  }

  /**
   * 基于axios.request方法的二次封装。
   * 
   * @param {Object|String} options - 完整请求配置参数或请求的地址。
   * 1. 完整包含axios的原生配置
   * 2. 配置有多个来源且会进行合并。可能的来源和合并优先级：AxiosExpand.defaults < AxiosExpand(options) <  apisConfig < api(options)。
   * 
   * @param {*|Function} options.local - 本地数据。
   * 1. 设置此参数后会跳过请求，直接resolve此参数设置的数据。
   * 2. 设置一个函数则返回此函数的调用结果
   * 
   * @param {Boolean} options.cache - 启用缓存数据。
   * 1. 此次请求会优先从缓存中查找，没有则正常请求，并存入缓存。
   * 
   * @param {Function} options.before - 选项最终合并完成后，发起请求前的回调函数。
   * 1. 可以用于每次请求前动态的调整各项参数
   * 2. 参数为最终合并完成的 options
   * 3. 可以直接修改options。也可以返回一个新的options。
   * 
   * @param {Array} options.transformBefore - 选项最终合并完成后，发起请求前的回调函数的数组。
   * 1. 一般设置到全局的参数中，用于需要全局处理的转换。before为针对当前请求的转换。
   * 2. 参数为前一个处理器处理完的 options
   * 3. 其他特性同上
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
   * @param {Function} options.pathParamsReg - 请求路径替换正则。默认值：/:([^\/?#]+)/g
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
   * @param {Function} options.after - 请求完成后的回调函数。
   * 1. 参数为响应的 response
   * 2. 可以用于在数据在实际使用前对数据进行处理
   * 3. 可以直接修改 response。也可以返回一个新的 response。
   * 
   * @param {Array} options.transformAfter - 请求完成后的回调函数的数组。
   * 1. 一般设置到全局的参数中，用于需要全局处理的转换。after为针对当前请求的转换。
   * 2. 参数为前一个处理器处理完的 response
   * 3. 其他特性同上
   * 
   * @param {Function} options.errorIntercept - 错误拦截器
   * 1. 用于处理响应正确，但是业务上请求错误的逻辑。
   * 2. 返回一个布尔值，为true表示响应异常。会直接 throw response;
   * 3. 如此产生的错误会在 response 对象上新增一个 $fromErrorIntercept: true 的属性用于判断
   * 
   * @param {Function} options.transformInstance - 实例转换处理函数
   * 1. 参数为原始请求的Promise实例
   * 2. 如果返回了非undfined和null的值，则会用此值生成新的实例替换原本的Promise实例
   * 3. 没有返回值的情况下只会在原本的实例上增加处理函数
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

    options = this._formatRequestOptions(options, params, method);

    // transformBefore
    if (typeOf(options.transformBefore, "Array")) {
      let transforms = options.transformBefore;
      transforms.forEach(handler => {
        if (typeOf(handler, "Function")) {
          options = handler(options) || options;
        }
      });
    }

    // before
    if (typeOf(options.before, "Function")) {
      options = options.before(options) || options;
    }

    // url
    if (options.url) {
      options.url = this._pathParams(options);
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
      RP = super.request(options)
    }

    // cache
    if (options.cache && !cache) {
      this._setCatch(options, RP);
    }

    // transformAfter
    if (typeOf(options.transformAfter, "Array")) {
      RP = RP.then(res => {
        let transforms = options.transformAfter;
        transforms.forEach(handler => {
          if (typeOf(handler, "Function")) {
            res = handler(res) || res;
          }
        });
        return res;
      })
    }

    // after
    if (typeOf(options.after, "Function")) {
      RP = RP.then(res => {
        res = options.after(res) || res;
        return res;
      })
    }

    // errorIntercept
    if (typeOf(options.errorIntercept, "Function")) {
      RP = RP.then(res => {
        if (options.errorIntercept(res)) {
          res.$fromErrorIntercept = true;
          throw res;
        }
        return res;
      });
    }

    // transformInstance
    if (typeOf(options.transformInstance, "Function")) {
      let rv = options.transformInstance(RP);
      if (isValue(rv)) {
        if (!typeOf(rv, "Promise")) {
          rv = Promise.resolve(rv);
        }
      } else {
        rv = RP;
      }
      RP = rv;
    }

    return RP;

  }

  _pathParams({
    url,
    params,
    data,
    pathParamsReg
  }) {
    if (params || data) {
      url = url.replace(pathParamsReg, function (rv, $1) {
        let target;
        if (params && $1 in params) {
          target = params;
        } else if (data && $1 in data) {
          target = data;
        }
        if (target) {
          rv = target[$1];
          delete target[$1];
        }
        return rv;
      });
    }
    return url;
  }

  _formatRequestOptions(options, params, method) {

    if (typeOf(options, "String")) {
      options = {
        url: options
      };
    }

    const _options = merge(this.defaults, options, true);

    if (typeOf(method, "String")) {
      _options.method = method;
    }

    if (params) {
      switch (toUpperCase(_options.method)) {
        case "POST":
          _options.data = typeOf(_options.data, "Object") && typeOf(params, "Object") ? merge(_options.data, params) : params;
          break;
        default:
          if (typeOf(params, "Object")) {
            _options.params = merge(_options.params, params);
          }
          break;
      }
    }
    if (_options.requestType && _options.data) {
      let contentType, data;
      switch (toLowerCase(_options.requestType)) {
        case "form-url":
          contentType = "application/x-www-form-urlencoded;charset=utf-8";
          data = qs(_options.data);
          break;
        case "form":
          contentType = "multipart/form-data;charset=utf-8"
          data = toFormData(_options.data);
          break;
        case "json":
          contentType = "application/json;charset=utf-8";
          data = JSON.stringify(_options.data);
          break;
      }
      if (contentType) {
        _options.headers = merge({
          "Content-Type": contentType
        }, _options.headers, true);
      }
      if (data) {
        _options.data = data;
      }
    }

    return _options;

  }

  // 根据options的关键数据生成一个对应的id
  _getOptionsId(options) {
    let {
      url,
      params,
      method
    } = options;
    if (params) {
      params = Object.keys(params).sort().map(k => k + "=" + params[k]).join("&");
    }
    if (!method) {
      method = "get";
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
      statusText: ""
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