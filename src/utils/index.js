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
 */
// TODO amo 优化，不使用递归
export function merge(...args) {
  let returnNew = args[args.length - 1];
  if (typeof returnNew === "object") {
    returnNew = false;
  } else {
    args.splice(-1, 1);
  }
  return args.reduce((a, b) => {
    // 此处判断的作用是将 args 的第一个有效值做为 reduce 的第二参数，且过滤空值
    return a ? mergeCore(a, b) : b;
  }, null);

  function mergeCore(a, b) {
    if (b) {
      let ta, tb = typeOf(b);
      if (!a) {
        if (tb === "Object") {
          a = {};
        } else if (tb === "Array") {
          a = [];
        }
      }
      ta = typeOf(a);
      if (ta === tb) {
        let aItem;
        if (returnNew) {
          a = ta === "Object" ? Object.assign({}, a) : a.slice();
        }
        each(b, (bItem, k) => {
          aItem = a[k];
          let ta = typeOf(aItem),
            tb = typeOf(bItem);
          if (ta === tb && (ta === "Array" || ta === "Object")) {
            a[k] = mergeCore(aItem, bItem);
          }else {
            a[k] = bItem;
          }
        });
      }
    }
    return a;
  }
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