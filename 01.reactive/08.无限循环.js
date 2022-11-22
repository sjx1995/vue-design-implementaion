/*
 * @Description: 无限循环
 * @Author: Sunly
 * @Date: 2022-11-22 02:19:19
 */
let activeEffect;
const effectStack = [];
function effect(fn) {
  const effectFn = () => {
    activeEffect = effectFn;
    effectStack.push(effectFn);
    cleanup(effectFn);
    fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  };
  effectFn.deps = [];
  effectFn();
}
function cleanup(effectFn) {
  effectFn.deps.forEach((fn) => fn.delete(effectFn));
  effectFn.deps.length = 0;
}
const bucket = new WeakMap();
function track(target, key) {
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
  activeEffect.deps.push(deps);
}
function trigger(target, key) {
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  // 新增以下代码解决无限循环问题
  // 无限循环的问题出在当前effect还没有结束的时候，又在trigger触发了当前的effect
  // 解决方案：如果触发的fn和activeEffect相同，那么就不触发了
  const runDeps = new Set();
  deps &&
    deps.forEach((dep) => {
      if (dep !== activeEffect) {
        runDeps.add(dep);
      }
    });
  runDeps.forEach((fn) => fn());
}

const data = { foo: 1 };
const obj = new Proxy(data, {
  get(target, key) {
    if (!activeEffect) return target[key];
    track(target, key);
    return target[key];
  },
  set(target, key, newVal) {
    target[key] = newVal;
    trigger(target, key);
    return true;
  },
});

// 测试
effect(() => {
  // 底下两行代码是等价的，会造成无限循环
  // obj.foo++;
  obj.foo = obj.foo + 1;
});
