/*
 * @Description: 重新设计bucket
 * @Author: Sunly
 * @Date: 2022-11-21 03:07:31
 */
const data = { text: "hello world" };
let activeEffect;
function effect(fn) {
  activeEffect = fn;
  fn();
}

// 我们需要重新设计桶，让副作用函数和属性之间建立关系
// objMap<obj,keyMap> -> keyMap<key,set> -> Set<effects>
const bucket = new WeakMap();
const obj = new Proxy(data, {
  get(target, key) {
    if (!activeEffect) return target[key];
    let depsMap = bucket.get(target);
    if (!depsMap) {
      depsMap = new Map();
      bucket.set(target, depsMap);
    }
    let deps = depsMap.get(key);
    if (!deps) {
      deps = new Set();
      depsMap.set(key, deps);
    }
    deps.add(activeEffect);
    return target[key];
  },
  set(target, key, newVal) {
    target[key] = newVal;
    const depsMap = bucket.get(target);
    if (!depsMap) return;
    const deps = depsMap.get(key);
    deps && deps.forEach((fn) => fn());
  },
});

// 测试
effect(function () {
  console.log("副作用函数执行了", obj.text);
});
setTimeout(() => {
  console.log("修改了响应式的值");
  obj.text = "reactive";
}, 1000);
setTimeout(() => {
  console.log("没有修改响应式的值");
  obj.age = 19;
}, 2000);
