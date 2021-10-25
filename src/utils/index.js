// 获取元素的绝对类型
export function typeOf(t, e) {
  let type = Object.prototype.toString.call(t).slice(8, -1);
  return e ? type === e : type;
}
/**
 * 合并数组或者对象
 * @param  {...(object|array)} args - 待合并的数组或者对象
 * @param  {boolean} args[args.length-1] - 是否返回新对象。参数列表的最后一个参数
 * @returns {object|array} 返回参数的第一个对象，如果设置为返回新对象，则会先复制再返回。
 * TODO amo 循环结构处理
 */
 export function merge(...args) {
  let returnNew = args[args.length - 1],
    initData;

  if (typeof returnNew === "object") {
    returnNew = true;
  } else {
    args.splice(-1, 1);
  }

  args = args.filter((item) => typeof item === "object");
  initData = args.splice(0, 1)[0];

  if (returnNew) {
    initData = copy(initData);
  }

  return args.reduce((a, b) => {
    return mergeCore(a, b);
  }, initData);

  function mergeCore(a, b) {
    const rv = {
      v: a,
    };
    const pool = [[a, b, rv, "v"]];
    // 使用循环代替递归
    while (pool.length) {
      let [a, b, c, d] = pool[0]; // c-待赋值的对象 d-待赋值的键
      let aItem;
      each(b, (bItem, k) => {
        aItem = a[k];
        let ta = typeOf(aItem),
          tb = typeOf(bItem);
        if (VV(ta, tb)) {
          pool.push([aItem, bItem, a, k]);
        } else {
          if (returnNew && (tb === "Object" || tb === "Array")) {
            bItem = copy(bItem);
          }
          a[k] = bItem;
        }
      });
      c[d] = a;
      pool.shift();
    }

    return rv.v;
    // verify value
    function VV(ta, tb) {
      return ta === tb && (ta === "Array" || ta === "Object");
    }
  }
}
/**
 * 深度复制数组或者对象
 * @param {*} target 
 * @returns 
 */
export function copy(target) {
  // 非对象和数组直接返回原始值
  const targetType = typeOf(target);
  if (targetType !== "Object" && targetType !== "Array") {
    return target;
  }

  let item = {
    target,
  };
  const pool = [
    {
      parent: item,
      target,
      key: "target",
    },
  ];
  let newTarget, current, typeItem, isTypeTargetObject;
  while (pool.length) {
    current = pool[0];
    isTypeTargetObject = typeOf(current.target, "Object");
    newTarget = isTypeTargetObject ? {} : [];
    each(current.target, (item, k) => {
      typeItem = typeOf(item);
      if (typeItem === "Object" || typeItem === "Array") {
        pool.push({
          parent: newTarget,
          target: item,
          key: k,
        });
      } else if (isTypeTargetObject) {
        Object.defineProperty(
          newTarget,
          k,
          Object.getOwnPropertyDescriptor(current.target, k)
        );
      } else {
        newTarget[k] = item;
      }
    });
    current.parent[current.key] = newTarget;
    pool.shift();
  }
  return item.target;
}

export function each(target, cb) {
  let t = typeOf(target);
  if (t === "Array") {
    for (let i = 0; i < target.length; i++) {
      if (cb(target[i], i)) {
        break;
      }
    }
  } else if (t === "Object") {
    for (let k in target) {
      if (cb(target[k], k)) {
        break;
      }
    }
  }
}

export function errorMsg(msg) {
  console.error(msg);
}

export function toUpperCase(s) {
  return s && s.toUpperCase ? s.toUpperCase() : "";
}

export function toLowerCase(s) {
  return s && s.toLowerCase ? s.toLowerCase() : "";
}

export function qs(target) {
  let arr = [];
  if (typeOf(target, "Object")) {
    for (const k in target) {
      arr.push(k + "=" + target[k]);
    }
  }
  return target = arr.join("&");
}

export function toFormData(target) {
  let fd = new FormData();
  if (typeOf(target, "Object")) {
    for (const k in target) {
      fd.append(k, target[k]);
    }
  }
  return fd;
}

export function isValue(v) {
  return v || v === 0 || v === "";
}