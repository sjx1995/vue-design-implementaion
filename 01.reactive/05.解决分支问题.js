/*
 * @Description: 解决分支问题
 * @Author: Sunly
 * @Date: 2022-11-21 03:07:31
 */
// 要解决分支问题，我们可以在effect中反向保存有哪些set里面保存了这个effect，然后在执行effect之前，将已经收集了的这个effect全部移除，然后执行新的effect时再追踪，这样就不会有遗留问题了
let activeEffect;
function effect(fn) {
  const effectFn = () => {
    // 在执行之前先清除
    cleanup(effectFn);
    activeEffect = effectFn;
    fn();
  };
  // 我们在effect中创建一个deps数组来收集有哪些set收集了这个effect
  effectFn.deps = [];
  effectFn();
}
function cleanup(fn) {
  fn.deps.forEach((dep) => {
    dep.delete(fn);
  });
  // 因为我们要重新追踪有哪些set收集了当前effect，所以我们重置deps
  fn.deps.length = 0;
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
  // 将包含当前effect的set，追踪到effect.deps
  activeEffect.deps.push(deps);
}
function trigger(target, key) {
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  // 避免无限循环，我们要新创建一个新的Set
  const anotherDeps = new Set(deps);
  anotherDeps.forEach((fn) => fn());
}

const data = { ok: false, text: "hello world" };
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
effect(function () {
  let res = obj.ok ? obj.text : "not";
  console.log("副作用函数执行了", res);
});
console.log("执行副作用函数");
obj.ok = true;
console.log("执行副作用函数");
obj.text = "reactive";
console.log("执行副作用函数");
obj.ok = false;
console.log("此时res的值永远是‘not’，不应该再执行副作用函数");
obj.text = "no excute";
obj.text = "no excute again"; // 但是这里还是执行了副作用函数
