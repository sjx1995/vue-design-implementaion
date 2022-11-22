/*
 * @Description: 不包含过渡状态
 * @Author: Sunly
 * @Date: 2022-11-22 04:10:52
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
  effectFn.options = opt;
  effectFn();
}
function cleanup(effectFn) {
  effectFn.deps.forEach((item) => item.delete(effectFn));
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

const jobQueue = new Set();
// 当前同步任务执行完之后才会执行微任务
const p = Promise.resolve();
// 确保在微任务执行之前，只会注册一次待执行的微任务
let isFlushing = false;
function flushJob() {
  if (isFlushing) return;
  isFlushing = true;
  // 同步任务执行完之后，才会执行副作用函数
  p.then(() => {
    jobQueue.forEach((fn) => fn());
  }).finally(() => {
    isFlushing = false;
  });
}

effect(
  () => {
    console.log(obj.foo);
  },
  {
    scheduler(fn) {
      // job队列中不存在相同任务，确保队列中的副作用函数不重复
      jobQueue.add(fn);
      flushJob();
    },
  }
);

obj.foo++;
obj.foo++;
obj.foo++;
obj.foo++;

// 执行结果：
// 1
// 5
// 没有打印中间状态

// 保证只会执行一次不重复的微任务：
// 1.使用isFlushing标记，保证只注册一次的待执行的微任务列表，在同步任务执行完后只会执行一次
// 2.使用Set()，让待执行的任务队列中没有重复任务
