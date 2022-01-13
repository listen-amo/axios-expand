## 更新说明

*2022-01-12*
- 修复：commonjs导出bug
- 新增：导出 `mergeOptions` 方法。此方法可以将多个axios-expand配置进行合并
- 新增：`cache` 参数可以设置为一个方法，用于返回自定义缓存标识id
- 优化：文档更新

*2021-12-01*

- 重构：**`api` 和 `request` 方法进行了合并。`request` 方法现在可以查找接口配置列表中的配置了。而 `api` 方法只是做为别名使用**
- 新增： `generateOptions` 方法用于获取配置。并且优化了配置获取的逻辑。
- 优化：POST请求下本地缓存的id生成逻辑

*2021-11-16*

- 新增：`before` 处理函数返回 `false` 会中止当前请求
- 新增：保留了 `requestType` 参数转换前的原始 data 。可以在 `after`  `transformInstance` 等处理函数的响应结果的配置的 `originalData` 字段拿到
- 优化：`requestType` 参数的转换逻辑放在 `before` 执行之后。也就是说能够在 `before` 中直接拿到转换前的参数
- 优化：`after` 处理函数执行顺序放到了 `errorIntercept` 和 `transformInstance` 之后。避免发生异常时依然能够进到 `after` 处理函数中

*2021-10-29*

- 移除: `pathParamsReg`参数新增`pathParam`参数。需要自定义路径参数解析使用`before`参数实现
- 修复: 某些情况下误报 option.url 参数未设置的bug
- 优化: `requestType`参数的设置逻辑

*2021-10-25*

- 修复: 模块导出错误的bug
- 修复: merge函数以及copy函数逻辑错误导致的报错
- 优化: 配置参数
    - **优化了`before` `after` `transformInstance`参数。多个配置来源都设置了这些参数的时候会依次全部调用**
    - 删除了`transformBefore`参数。使用`before`参数代替
    - 删除了`transformAfter`参数。使用`after`参数代替

## 简介

对axios进行了如：配置式请求路径、本地数据、缓存数据、路径参数、GET，POST参数传递自动判断、请求前后拦截器增强，请求体类型设置等增强封装。

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

/*
	method: POST
	url: /api/login
	header: Content-Type: application/json
	body: { username: "admin", password: "password" }
*/
let p = AE.request("login", {
    username: "admin",
    password: "password"
})

/*
	method: POST
	url: /api/info?userId=123
*/
p = p.then((res)=> {
  return AE.request({
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
        username: "admin",
        password: "password"
    }
}).then(res=> {
    console.log(res.$data)
});
```

## 接口说明

### AxiosExpand

构建 `AxiosExpand` 实例的构造方法

#### 构造函数 `new AxiosExpand(options)`
- 参数
	- `options` - 当前实例的全局配置
- 返回值：一个 `AxiosExpand` 实例

```js
import AxiosExpand from "axios-expand";
const AE = new AxiosExpand({
    before: [
        function(options){
            console.log(options) // { url: "/api/data", params: { id: 1 }, ... }
        }
    ]
});
AE.request("/api/data", { id: 1 }).then(res=> {...});
```

#### 静态属性

- `AxiosExpand.defaults` 全局的`options`配置，会影响所有实例

  ```js
  import AxiosExpand from "axios-expand";
  AxiosExpand.defaults = {
  	requestType: "form-url"
  }
  const AE = new AxiosExpand();
  /*
      method: POST
      url: /api/data
      header: Content-Type: application/x-www-form-urlencoded
      body: id=1&name=amo
  */
  AE.request("/api/data", { id: 1, name: "amo" }, "POST").then(res=> {...});
  ```

  

### mergeOptions(...object)

合并多个 `options` 对象的方法，主要用于二次开发的时候对参数的处理。这个方法主要是进行对象深度合并，但是会区别 `before, after, transformInstance`  等属性，这些属性的值会合并为一个数组，而不是深度复制的直接覆盖值。

- 参数
  - 多个需要合并的配置对象，注意只能是对象，不能是字符串
- 返回值：合并后的对象

```js
import { mergeOptions } from "axios-expand";
const options = mergeOptions(
    {
        api: "login",
        params: {
            a: 10
        },
        before: function(option){
            console.log(1)
        }
    },
    {
        params: {
            b: 20
        },
        data: "data-string",
        before: [function(option){
            console.log(2)
        }]
    },
);

/*
返回值如下
{
    "api": "login",
    "before": [
    	function(option){
            console.log(1)
        },
        function(option){
            console.log(2)
        }
    ],
    "params": {
        "a": 10,
        "b": 20
    },
    "data": "data-string",
}
*/
console.log(options);

```



### AxiosExpand 实例

#### 方法
- `AE.request(options[, params[, method]]) ` 发起一个请求

  - 参数
    - `opitons` - 当前请求的完整配置 | 配置列表名称 | 请求路径 `url`
      - 传入一个 `object` 作为完整的 `options` 配置 *(具体配置查看后文)*
      - 传入一个配置的名称`string`，也就是 `apis` 配置项的键
      - 请求路径`string`
    - `params` - 当前请求的 `params` 或者 `data`。取决于当前方法是 `GET` 请求还是 `POST` 请求
      - 如果是 `params` 则会和 `options.params` 进行合并
      - 如果是 `data` 则会判断 `options.data` 的类型后决定是和合并还是覆盖
    - `method` - 当前请求的方法。默认为 `GET`
  - 返回值：返回响应的 `promise`
  - 此方法做了 `bind ` 处理可以直接赋值调用

  ```js
  import AxiosExpand from "axios-expand";
  const AE = new AxiosExpand({
      apis: {
          login: {
              url: "/api/login",
              params: {
                  type: "app",
              },
              data: {
                  username: "",
                  password: ""
              }
              method: "POST"
          }
      }
  });
  
  // 可以直接赋值或者模块导出后使用
  const request = AE.request;
  
  // 常规的 optoins 配置
  request({
      api: "login",
      parmas: { type: "web" },
      data: {
          username: "name",
          password: "123456"
      }
  }).then(res=> {});
  
  // 配置名称 - 这种方式无法同时覆盖 params 和 data
  request(
      "login", 
      {
          username: "name",
          password: "123456"
      }
  );
  
  // 请求路径
  request(
      "/api/login?type=app", 
      {
          username: "name",
          password: "123456"
      },
      "POST"
  );
  ```

- `AE.api(options[, params[, method]])`  只是一个 `request` 方法的别名
- `AE.generateOptions(options[, params[, method]])`  返回一个完整的配置对象
  - 参数：和 `request` 方法参数完全一致
  - 返回值：会从配置列表中查找并且合并、转换后得到的最终配置。 request 方法内部就是使用的此方法
  - 通常用在进行二次封装需要对参数进行处理的时候
  - 用此方法获取的 `options` 直接传入 `request` 方法时不会再次处理，会直接被作为最终配置

## options

首先，兼容axios所有的原生配置，额外配置都是在其基础上增加的。除了默认导出的是构造函数需要自己构建实例之外，基本可以无差别和axios一样使用。参下：

```js
import Axios from "axios/lib/core/Axios";
class AxiosExpand extends Axios {
    constructor(options) {
        super(
            mergeOptions(
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

### 选项来源

最终的 `request` 方法的选项，可能是多个来源合并后的最终结果。选项可能的来源和合并优先级：

```js
可能来源：
AxiosExpand.defaults     --> 所有实例的默认选项
new AxiosExpand(options) --> 当前实例的默认选项
apis                     --> 路径配置对象中的选项
request(options)         --> request 方法传入的选项

优先级：
AxiosExpand.defaults < new AxiosExpand(options) <  apis < request(options)
```

### 选项列表

### 选项说明

- `apis` ：选项配置对象，可以使用 `request` 方法查找此对象中的请求配置来进行请求

  - 类型：`object`
  - 只能在实例初始化阶段配置

  ```js
  import AxiosExpand from "axios-expand";
  
  const AE = new AxiosExpand({
      apis: {
          // 一个基本配置选项
          login: {
              url: "/api/login",
              method: "POST",
          },
          // 简写配置选项 等同 { url: "/api/info", method: "POST" }
          userInfo: "/api/info"
      }
  });
  
  const request = AE.request;
  
  request("login", {
      username: "admin",
      password: "password"
  }).then((res)=> {
    return request({
        api: "userInfo",
        params: { userId: res.data.userId },
        data: res.data.token
    }) 
  }).then((res)=> {
      console.log(res.data.info)
  });
  ```

  

- `api` ：配置对象`apis`的一个键名。代表需要使用这个配置进行请求

  - 类型：`string`
  - 只能在 `request` 方法中使用
  - 当 `request` 方法的第一个参数为 `string` 的时候，会优先视为此参数的简写，如果查找不到则会被视为一个请求路径

  ```js
  import AxiosExpand from "axios-expand";
  
  const AE = new AxiosExpand({
      apis: {
          login: {
              url: "/api/login",
              method: "POST",
          },
          userInfo: "/api/info"
      }
  });
  
  const request = AE.request;
  
  // 简写方式 等同 request({ api: "login", params: { ... } });
  request("login", {
      username: "admin",
      password: "password"
  }).then((res)=> {
    // 常规方式
    return request({
        api: "userInfo",
        params: { userId: res.data.userId },
        data: res.data.token
    }) 
  }).then((res)=> {
      // 设置路径
      request("/api/isInit", { name: res.data.name });
  });
  ```

- `url` ：请求路径

  - 类型：`string`

  - 新增了路径参数替换功能

    ```js
    import AxiosExpand from "axios-expand";
    
    const AE = new AxiosExpand({
        apis: {
            userInfo: {
    	        // 使用 :name 的格式设置参数位置
                url: "/api/info/:userId"
            }
        }
    });
    
    AE.request({
        api: "userInfo",
        params: {
            // 这个参数会被传递给路径
            userId: 123,
            // 其它参数会被保留为查询字符串参数
            type: "web"
        }
    });
    // 转换后最终的 url 格式为: /api/info/123?type=web
    
    ```

- `pathParam`： 是否开启路径请求参数处理

  - 类型：`boolean`

  - 默认值：`true`

  - 禁用后不会自动转换路径参数。可以自己在 `before` 函数中处理

    ```js
    import AxiosExpand from "axios-expand";
    
    const AE = new AxiosExpand({
        // 禁用路劲参数
        pathParam: false,
        apis: {
            userInfo: {
    	        // 自定义路径参数格式
                url: "/api/info/{userId}"
            }
        },
        before: [
    	    // 自定义路径处理逻辑
            function(options){
                options.url = options.url.replace(/\{(.+)\}/g, function(m, $1){
                    let value = options.params[$1];
                    return value || m;
                })
            }
        ]
    });
    
    ```
  
- `requestType`： 请求类型。会根据类型自动设置请求头的 `Content-Type` 以及当 `data` 为 `object` 时会自动转换 `data` 格式为匹配当前类型的数据格式

  - 类型：`string`
  - 默认值：`json`
  - 可选值
    - `json`：`application/json` 格式
    - `form`：`multipart/form-data` 格式
    - `form-url`：`application/x-www-form-urlencoded` 格式
  - 只在`method`为`POST`时才有效
  
  ```js
  import AxiosExpand from "axios-expand";
  
  const AE = new AxiosExpand({
      apis: {
          login: {
              url: "/api/login"，
          	method: "POST"
          }
      }
  });
  
  /*
  	json 格式
  	
  	Content-Type: application/json
  	data: '{"usename":"admin","password":"123456"}'
  */
  AE.request({
      api: "login",
      requestType: "json",
      data: {
          usename: "admin",
          password: "123456"
      }
  });
  
  /*
  	form 格式
  	
  	Content-Type: multipart/form-data
  	data: FormData
  */
  AE.request({
      api: "login",
      requestType: "form",
      data: {
          usename: "admin",
          password: "123456"
      }
  });
  
  /*
  	form-url 格式
  	
  	Content-Type: application/x-www-form-urlencoded
  	data: "usename=admin&password=123456"
  */
  AE.request({
      api: "login",
      requestType: "form-url",
      data: {
          usename: "admin",
          password: "123456"
      }
  });
  ```
  
- `before`： 选项合并完成后，发起请求前的处理方法。可以在这里拓展对 `options` 的处理

  - 类型：`function | array<function>`
    - 参数：合并完成后的 `options`
    - 返回值
      - 无
      - 返回一个 `object` 时为新的 `options`
      - 返回 `false` 会终止当前请求
  - 可以直接修改 `options`。也可以返回一个新的 `options`
  - 如果多个配置来源都配置了 `before` 参数会自动合并为一个数组依次调用

  ```js
  import AxiosExpand from "axios-expand";
  
  const AE = new AxiosExpand({
      apis: {
          update: "/api/update"
      },
      before: [
          // 登录状态拦截
          function(){
              if(isLogin()){
                 toLogin();
                 return false
              }
          },
          // 设置自定义 headers 字段
          function(options){
      		options.headers = {
                Authorization: getToken(),
                ...options.headers,
              };
  		},
          // 返回新 options
          function(options){
      		return {
                  url: options.url
              }
  		}
      ]
  });
  
  AE.request({
      api: "update",
      before(options){
          console.log(options); // 这个处理方法会在最后被调用
      }
  });
  ```

- `after`： 请求完成后的处理方法。可以在这里对响应进行处理

  - 类型：`function | array<function>`
    - 参数：请求响应的 `response`
    - 返回值
      - 无
      - 返回一个 `object` 时为新的 `response`
  - 可以直接修改 `response`。也可以返回一个新的 `response`
  - 一般主要是对响应数据的处理
  - `response.config` 的等同于 `options` 。所以我们可以在 `after` 处理函数中通过 `options` 自定义参数进行不同处理
  - 如果多个配置来源都配置了 `after` 参数会自动合并为一个数组依次调用
  
  ```js
  import AxiosExpand from "axios-expand";
  
  const AE = new AxiosExpand({
      apis: {
          update: {
              url: "/api/update",
              // 自定义参数
          	msg: "更新成功"
          }
      },
      after: [
          // 空数据处理
          function(response){
              if(!response.data){
             		response.data = {};
              }
          },
          // 请求响应，本地提示
          function(response){
              let { msg } = response.config; // 本地配置的消息 response.config 等同于 options
              let { message } = response.data; // 服务器返回的消息
              if(msg){
                 if(message){
                    msg = message;
                 }else if(typeof msg !== "string"){
  	              msg = "操作成功!";
      	       }
                 alert(msg);
              }
  		}
      ]
  });
  
  AE.request({
      api: "update",
      after(response){
          console.log(response); // 这个处理方法会在最后被调用
      }
  });
  ```

- `transformInstance`： 请求 `promise` 实例的处理方法。可以在这里捕获异常或者进行 `then` 处理

  - 类型：`function | array<function>`
    - 参数：请求的 `promise` 实例
    - this: 当前 `AxiosExpand` 实例
    - 返回值
      - 无
      - 非 `undfined` 或 `null` 的值，则用此值生成新的 `promise` 实例替换原本的 `promise` 实例
  - `catch` 或 `then` 接收到的 `response` 会优先经过 `after` 的处理
  - 如果多个配置来源都配置了 `transformInstance` 参数会自动合并为一个数组依次调用
  
  ```js
  import AxiosExpand from "axios-expand";
  
  const AE = new AxiosExpand({
      apis: {
          save: {
              url: "/api/save",
              // 局部配置 通常为了封装多个请求
              transformInstance(promise){
                  return promise.then(()=> {
                     return this.request("update");
                  });
              }
          },
          update: "/api/update"
      },
      // 全局配置 通常用于捕获异常
      transformInstance:[
          function(promise) {
              // 捕获全局的异常
              promise.catch((response) => {
                  // 通过自定义参数判断是否需要显示异常消息
                  if (response.config.errorMessage !== false) {
                      const errMsg = response.data.errorMessage || "请求错误";
                      alert(errMsg);
                  }
              });
          }
      ],
  });
  
  AE.request("save").then((res)=> {
      // 这里实际上是 update 请求的结果
  });
  ```
  
- `errorIntercept`：错误拦截器。主要用于处理，响应正确，但是业务上请求错误的逻辑

  - 类型： `function`
    - 参数：请求响应的 `response`
    - 返回值
      - 无
      - 返回 `true` 表示请求错误。会直接执行 `throw response`。同时 会在 `response` 对象上新增一个 `$fromErrorIntercept: true` 的属性，可以用于在 `transformInstance` 异常捕获中进行判断
  - 用 `before` 或者 `transformInstance` 也能做到类似的处理。但是此方法有专门的相关逻辑处理更加便捷

  ```js
  import AxiosExpand from "axios-expand";
  
  const AE = new AxiosExpand({
      // 进行错误拦截
      errorIntercept(response) {
          let { data, status } = response;
          let code = data.code; // 业务自定义的状态码
          return status > 400 || code !== 100 && code !== 1;
      },
      transformInstance:[
          function(promise) {
              // 捕获异常
              promise.catch((response) => {
                  // 当 response.$fromErrorIntercept = true 则这个异常是来自 errorIntercept 的拦截
                  if (response.$fromErrorIntercept) {
                      // ...
                  }
              });
          }
      ],
  });
  ```

- `cache`：启用数据缓存。此次请求会优先从缓存中查找，没有则正常请求，并存入缓存。

  - 类型：`boolean | function`
    - 设置为 `ture` 会默认使用 `url + params + data（object格式） + method` 来作为缓存的判断依据，避免在参数复杂的情况下使用
    - 设置为 `function` 可以自己定义缓存的条件
      - 参数：为 `options`
      - 返回值：`string` 自定义缓存请求的 id 的字符串
  - 避免在全局配置中使用此参数

  ```js
  import AxiosExpand from "axios-expand";
  
  const AE = new AxiosExpand({
      apis: {
          userTypeList: {
              url: "/api/userTypeList",
              cache: true
          }
      }
  });
  
  // 只会产生一次请求
  AE.request("userTypeList"),
  AE.request("userTypeList");
  
  ```

- `local`: 本地静态数据。设置此参数后不会产生请求，而是使用本地设置的数据来作为响应的数据

  - 类型：`any | function`
    - 设置为非方法的任意数据时，这个请求 `response.data` 则指向这条数据
    - 设置为 `function` 时，会调用这个方法，用方法的返回结果作为这个请求的数据
      - 参数：为 `options`

  ```js
  import AxiosExpand from "axios-expand";
  
  const AE = new AxiosExpand({
      apis: {
          localTypeList: {
              local: [
                  { name: "管理员", type: "admin"},
                  { name: "普通用户", type: "user"}
              ]
          }
      }
  });
  
  AE.request("localTypeList").then(response=> {
      /*
      response 是一个简单模拟 response 的对象 
      {
        data: [{ name: "管理员", type: "admin"}, { name: "普通用户", type: "user"}],
        config: options,
        headers: {},
        request: {},
        status: 200,
        statusText: "",
      }
      */ 
      console.log(response);
  })
  ```

  

