/*
 * @Description: 调度执行
 * @Author: Sunly
 * @Date: 2022-11-22 02:56:10
 */
let activeEffect;
const effectStack = [];
function effect(fn, opt = {}) {
  const effectFn = () => {
    activeEffect = effectFn;
    effectStack.push(effectFn);
    cleanup(effectFn);
    fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  };
  effectFn.deps = [];
  // 合并选项options
  effectFn.options = opt;
  effectFn();
}
function cleanup(effectFn) {
  effectFn.deps.forEach((deps) => deps.delete(effectFn));
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
  const runDeps = new Set();
  deps &&
    deps.forEach((effect) => {
      // 如果存在调度器，那么就调用调度器而不是effect
      if (effect !== activeEffect) {
        runDeps.add(effect);
      }
    });
  runDeps.forEach((effect) => {
    if (effect.options.scheduler) {
      effect.options.scheduler(effect);
    } else {
      effect();
    }
  });
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
effect(
  function () {
    console.log(obj.foo);
  },
  {
    // 添加调度器
    // 改变了执行顺序
    // 在trigger中触发收集的副作用函数时，调度任务会替代副作用被执行
    scheduler(fn) {
      setTimeout(fn);
    },
  }
);
obj.foo++;
console.log("结束了");
