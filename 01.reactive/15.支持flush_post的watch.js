/*
 * @Description: 支持flush:post的watch
 * @Author: Sunly
 * @Date: 2022-11-23 09:52:18
 */
// watch的回调的执行时机：https://cn.vuejs.org/guide/essentials/watchers.html#callback-flush-timing
// 这里只模拟flush: sync/post 的情况
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

function traverse(value, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  for (const key in value) {
    traverse(value[key], seen);
  }
}
function watch(source, cb, opt = {}) {
  let getter;
  if (typeof source === "function") {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  let newVal, oldVal;
  const job = () => {
    newVal = effectFn();
    cb(newVal, oldVal);
    oldVal = newVal;
  };

  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler() {
      if (opt.flush === "flush") {
        // dom操作是同步的，所以将job放在微任务队列中，可以拿到更新后的dom
        const p = Promise.resolve();
        p.then(job);
      } else {
        job();
      }
    },
  });

  if (opt.immediate) {
    job();
  } else {
    oldVal = effectFn();
  }
}

watch(
  () => obj.foo,
  () => {
    console.log("emit");
  },
  {
    flush: "flush",
  }
);

obj.foo++;
