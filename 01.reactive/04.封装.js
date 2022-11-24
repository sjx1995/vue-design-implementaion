/*
 * @Description: 封装
 * @Author: Sunly
 * @Date: 2022-11-21 03:07:31
 */
const data = { text: "hello world", ok: false };
let activeEffect;
function effect(fn) {
  activeEffect = fn;
  fn();
}

// 将追踪副作用函数和触发副作用函数的相关代码封装到track和trigger函数中
const bucket = new WeakMap();
// 追踪：追踪的是副作用函数，然后保存副作用函数和其依赖之前的关系
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
}
// 触发：根据target和key，触发之前收集的对应的副作用函数，即实现了改变依赖自动触发的响应式
function trigger(target, key) {
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  deps && deps.forEach((fn) => fn());
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

// 测试
// effect(function () {
//   console.log("副作用函数执行了", obj.text);
// });
// setTimeout(() => {
//   console.log("修改了响应式的值");
//   obj.text = "reactive";
// }, 1000);
// setTimeout(() => {
//   console.log("没有修改响应式的值");
//   obj.age = 19;
// }, 2000);

// 问题：
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
obj.text = "no execute";
obj.text = "no execute again"; // 但是这里还是执行了副作用函数
