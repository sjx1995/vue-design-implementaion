/*
 * @Description: 不支持嵌套的effect
 * @Author: Sunly
 * @Date: 2022-11-21 13:44:20
 */
const data = { foo: true, bar: true };
let activeEffect;
const bucket = new WeakMap();
function effect(fn) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    console.log(fn, "当前的activeEffect");
    fn();
    console.log(fn, "执行完了");
  };
  effectFn.deps = [];
  effectFn();
}
function cleanup(fn) {
  fn.deps.forEach((item) => {
    item.delete(fn);
  });
  fn.deps.length = 0;
}
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
  console.log("收集");
  activeEffect.deps.push(deps);
}
function trigger(target, key) {
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  const anotherSet = new Set(deps);
  anotherSet.forEach((fn) => fn());
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

// 嵌套的情况
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
// 和实际结果相同：
// effectFn2 执行了

// 预期的结果应该是effectFn1执行，嵌套在里面的effectFn2也会被执行
obj.foo = false;
// 但是，实际结果：
// effectFn2 执行了

// [Function: effectFn1] 当前的activeEffect
// effectFn1 执行了
// [Function: effectFn2] 当前的activeEffect
// effectFn2 执行了
// 收集
// [Function: effectFn2] 执行完了
// 收集
// [Function: effectFn1] 执行完了
// [Function: effectFn2] 当前的activeEffect
// effectFn2 执行了
// 收集
// [Function: effectFn2] 执行完了

// 可以看到，当effectFn2执行的时候，覆盖了activeEffect，而且当effectFn2执行完后，没有恢复effectFn1

// 问题出在我们同一时刻只能记录一个activeEffect，所以我们使用一个副作用函数栈effectStack来保存嵌套关系
