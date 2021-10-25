## 更新说明

*2021-10-25*
- 修复模块导出错误的bug
- 修复merge函数以及copy函数逻辑错误导致的报错
- 优化配置参数
    - **优化了`before` `after` `transformInstance`参数。多个配置来源都设置了这些参数的时候会依次全部调用**
    - 删除了`transformBefore`参数。使用`before`参数代替
    - 删除了`transformAfter`参数。使用`after`参数代替

## 简介

对axios进行了如：配置式列表路径、本地数据、缓存数据、路径参数、GET，POST参数传递自动判断、请求前后拦截器增强，请求体类型设置等增强封装。

## 接口说明

- `request(options[, params[, method]]) `

```js
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
   * @param {Array<Function>|Function} options.before - 选项最终合并完成后，发起请求前的回调函数。
   * 1. 可以用于每次请求前动态的调整各项参数
   * 2. 参数为最终合并完成的 options
   * 3. 可以直接修改options。也可以返回一个新的options。
   * 4. 多个配置来源的参数会自动合并依次调用
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

  _request(options, params, method) {....}
```

- `api(options[, params])`

```js
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
_api(options, params) {....}
```



## options

首先，兼容axios所有的原生配置，额外配置都是在其基础上增加的。除了默认导出的是构造函数，需要自己构建实例之外，基本可以无差别和axios一样使用。参下：

```js
import Axios from "axios/lib/core/Axios";
class AxiosExpand extends Axios {
    constructor(options) {
        super(
            merge(
                defaults,
                AxiosExpand.defaults,
                options,
                true
            )
        );
    },
    ......
}
```

- 选项来源

最终的 `request` 方法的选项，可能是多个来源合并后的最终结果。选项可能的来源和合并优先级：

```js
可能来源：
AxiosExpand.defaults --> 所有实例的默认选项
new AxiosExpand(options) --> 当前实例的默认选项
apiOptions --> 路径配置列表中的选项（通过 api 方法调用时）
api(options) --> api 方法传入的选项（通过 api 方法调用时）

优先级：
AxiosExpand.defaults < AxiosExpand(options) <  apiOptions < api(options)
```

## 使用示例

- 基本

```js
import AxiosExpand from "axios-expand";
const AE = new AxiosExpand();
/*
	method: GET
	url: /api/data?id=1
*/
AE.request("/api/data", { id: 1 });

/*
	method: POST
	url: /api/data
	header: Content-Type: application/json
	body: { id: 1 }
*/
AE.request("/api/data", { id: 1 }, "POST");

/*
	method: POST
	url: /api/data?id=1
	header: application/x-www-form-urlencoded
	body: name=amoamo&age=18
*/
AE.request({
    url: "/api/data",
    method: "POST",
    params: { id: 1 },
    requestType: "form-url", // 请求类型。自动设置对应的Content-Type和格式化数据。
    data: { name: "amoamo", age: 18 }
});
```

- 配置路径列表

```js
import AxiosExpand from "axios-expand";

// 路径映射列表
const apis = {
    login: {
        url: "/api/login",
        method: "POST",
    },
    userInfo: "/api/info"
}

// 创建实例并传入初始参数
const AE = new AxiosExpand({
    apis // 注册列表
});

// api 和 request 方法内部进行了 bind 处理，可以直接赋值使用
const api = AE.api;

/*
	method: POST
	url: /api/login
	header: Content-Type: application/json
	body: { username: "admin", password: "password" }
*/
let p = api("login", {
    username: "admin",
    password: "password"
})

/*
	method: POST
	url: /api/info?userId=123
*/
p = p.then((res)=> {
  return api({
      api: "userInfo",
      params: { userId: res.data.userId }
  }) 
});

p.then((res)=> {
    console.log(res.data.info)
});
```

- 多个选项来源

```js
import AxiosExpand from "axios-expand";
// 1. 全局选项
AxiosExpand.defaults = {
    requestType: "form-url"
}
// 2. 实例选项
const AE = new AxiosExpand({
    apis: {
	    // 3. 请求配置列表选项
        login: {
            url: "/api/login",
            method: "POST"
        }
    },
    after: [function(res){
    	res.$data = res.data.data || {};
	}],
    errorIntercept(res){
    	return res.data.code === 0;
	},
    transformInstance(p) {
        p.catch(res => {
            if (res.$fromErrorIntercept) {
                console.warn(res)
            }else{
                console.error(res);
            }
        })
    }
});
// 4. api 参数选项
AE.api({
    api: "login",
    data: {
        
    }
}).then(res=> {
    console.log(res.$data)
});
```

