/*
 * @Description: 副作用函数调用栈
 * @Author: Sunly
 * @Date: 2022-11-21 14:31:05
 */
const data = { foo: true, bar: true };
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
function cleanup(fn) {
  fn.deps.forEach((item) => item.delete(fn));
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
  activeEffect.deps.push(deps);
}
function trigger(target, key) {
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  const anotherDeps = new Set(deps);
  anotherDeps.forEach((fn) => fn());
}
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

// 上一节的例子
let temp1, temp2;
effect(function effectFn1() {
  console.log("effectFn1 执行了");
  effect(function effectFn2() {
    console.log("effectFn2 执行了");
    temp2 = obj.bar;
  });
  temp1 = obj.foo;
});

// 预期的结果应该是只有effectFn2执行
// obj.bar = false;

// 预期的结果应该是effectFn1执行，嵌套在里面的effectFn2也会被执行
obj.foo = false;
