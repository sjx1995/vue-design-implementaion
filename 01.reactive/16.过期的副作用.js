/*
 * @Description: 过期的副作用
 * @Author: Sunly
 * @Date: 2022-11-24 02:04:59
 */
let activeEffect;
const effectStack = [];
function effect(fn, opt = {}) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    effectStack.push(activeEffect);
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
  if (typeof value !== "object" || value === "null" || seen.has(value)) return;
  seen.add(value);
  for (const key in value) {
    traverse(value[key]);
  }
  return value;
}
function watch(source, cb, opt = {}) {
  let getter;
  if (typeof source === "function") {
    getter = source;
  } else {
    getter = () => traverse(source);
  }

  let invalidateFn;
  function onInvalidate(fn) {
    invalidateFn = fn;
  }

  let newVal, oldVal;
  const job = () => {
    if (invalidateFn) {
      invalidateFn();
    }
    newVal = effectFn();
    cb(newVal, oldVal, onInvalidate);
    oldVal = newVal;
  };

  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler() {
      if (opt.flush === "post") {
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

let isWaited = false;
function waitAMoment() {
  if (isWaited) return;
  return new Promise((resolve) => {
    isWaited = true;
    setTimeout(() => {
      return resolve();
    }, 1000 * 1000);
  });
}

watch(
  () => obj.foo,
  async (newVal, oldVal, onInvalidate) => {
    let canUpdate = true;
    onInvalidate(() => {
      canUpdate = false;
    });
    await waitAMoment();
    if (canUpdate) {
      console.log("updated", newVal);
    }
  }
);

obj.foo++;
setTimeout(() => {
  obj.foo++;
}, 300);
