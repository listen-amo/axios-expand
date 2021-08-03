import Axios from "axios/lib/core/Axios";
import {
  merge,
  typeOf,
  errorMsg
} from "./utils";

const defaults = {
  responseType: "json"
}

export default class AxiosExpand extends Axios {

  constructor(options) {
    super(merge(defaults, AxiosExpand.defaults, options, true));
    this._initApis();
  }

  static defaults = {};

  _apis = null;
  _cache = null;

  _initApis() {
    let apis = this.defaults.apis;
    this._apis = typeOf(apis, "Object") ? apis : {};
    delete this.defaults.apis;
  }

  /**
   * 
   */
  api(options, params) {
    options = this._formatApiOptions(options);
    if (options) {
      return this.request(options, params);
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
   * @param {Function} options.after - 请求完成后的回调函数。
   * 1. 可以用于在数据在实际使用前对数据进行处理
   * 2. 可以直接修改data。也可以返回一个新的data。
   * 
   * @param {*} params - 请求参数（GET请求）或请求数据（POST请求）。
   * 1. 如果是请求参数则会和 options.params 进行合并
   * 2. 如果是请求数据则直接覆盖 options.data
   * 
   * @param {String} method - 请求方法
   * 
   * @returns {Promise}
   */
  request(options, params, method) {

    options = this._formatRequestOptions(options, params, method);
    
    if (typeOf(options.before, "Function")) {
      options = options.before(options) || options;
    }

    if (!options.url) {
      errorMsg("options.url is required.");
      return Promise.reject(null);
    }

    let RP, cache;

    if ("local" in options) {
      RP = Promise.resolve(this._getLocal(options));
    } else if (options.cache && (cache = this._getCache(options))) {
      RP = cache;
    } else {
      RP = super.request(options)
    }

    if (options.cache && !cache) {
      this._setCatch(options, RP);
    }

    if (typeOf(options.after, "Function")) {
      RP = RP.then(res => {
        res.data = options.after(res.data) || res.data;
        return res;
      })
    }

    return RP;
  }

  _formatRequestOptions(options, params, method) {
    const _options = merge(this.defaults, options, true);
    if (typeOf(options, "String")) {
      _options.url = options;
    }
    if (typeOf(method, "String")) {
      _options.method = method;
    }
    if (params) {
      switch (_options.method && _options.method.toUpperCase()) {
        case "POST":
          _options.data = params;
          break;
        default:
          if (typeOf(params, "Object")) {
            _options.params = merge(_options.params, params);
          }
          break;
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