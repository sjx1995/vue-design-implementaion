/*
 * @Description: watch 的简单实现
 * @Author: Sunly
 * @Date: 2022-11-23 05:06:39
 */
// watch 实际上就是使用了effect配合scheduler

let activeEffect;
const effectStack = [];
function effect(fn, opt = {}) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    effectStack.push(effectFn);
    const res = fn();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
    return res;
  };
  effectFn.deps = [];
  effectFn.options = opt;
  if (!opt.lazy) {
    effectFn();
  }
  return effectFn;
}
function cleanup(effectFn) {
  effectFn.deps.forEach((deps) => deps.delete(effectFn));
  effectFn.deps.length = 0;
}

const bucket = new WeakMap();
function track(target, key) {
  if (!activeEffect) return;
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

const data = { foo: 1, bar: 2, baz: 3 };
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

function traverse(value, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  for (const k in value) {
    traverse(value[k], seen);
  }
  return value;
}
function watch(source, cb) {
  let getter;
  let newVal, oldVal;
  if (typeof source === "function") {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler() {
      newVal = effectFn();
      cb(newVal, oldVal);
      oldVal = newVal;
    },
  });
  oldVal = effectFn();
}

// 对象
// traverse会遍历对象的每一个属性，这个过程触发Proxy.get，建立追踪关系
// 然后再修改对应的属性时，执行了scheduler，触发了effectFn，清楚了依赖关系，然后触发traverse后又重建了依赖
// 也就是在scheduler中手动执行了effect
watch(obj, (newVal, oldVal) => {
  // 这里的newVal和oldVal是相同的值，因为引用的对象是同一个
  console.log("obj 更新了", newVal, oldVal);
});
// getter
// watch(
//   () => obj.foo,
//   (newVal, oldVal) => {
//     console.log("obj.foo更新了", oldVal, newVal);
//   }
// );

obj.foo++;
obj.foo++;

obj.bar++;
