/*
 * @Description: lazy effect
 * @Author: Sunly
 * @Date: 2022-11-22 09:44:00
 */
let activeEffect;
const effectStack = [];
function effect(fn, opt = {}) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    effectStack.push(activeEffect);
    // 在执行副作用函数时，返回函数的执行结果
    const res = fn();
    console.log("执行了fn");
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
    return res;
  };
  effectFn.deps = [];
  effectFn.options = opt;
  // 只有lazy不为true时才执行effect
  if (!opt.lazy) {
    effectFn();
  }
  // 把包装了的effectFn返回出去，供手动调用
  return effectFn;
}
function cleanup(effectFn) {
  effectFn.deps.forEach((dep) => dep.delete(effectFn));
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

const data = { foo: 1, bar: 2 };
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

// 3s后调用时触发effect
// const effectFn = effect(
//   () => {
//     console.log(obj.foo);
//   },
//   {
//     lazy: true,
//   }
// );
// setTimeout(() => {
//   effectFn();
// }, 3000);

// 2s后获取到返回值
// const effectFn = effect(() => obj.foo + obj.bar, { lazy: true });
// setTimeout(() => {
//   const value = effectFn();
//   console.log(value);
// }, 2000);

// 实现一个简单的computed
function computed(getter) {
  const effectFn = effect(getter, { lazy: true });
  const obj = {
    get value() {
      return effectFn();
    },
  };
  return obj;
}
const sum = computed(() => obj.foo + obj.bar);
console.log(sum.value);

obj.foo++;
console.log(sum.value);
console.log(sum.value);
console.log(sum.value);
console.log(sum.value);

// computed的问题：没有缓存！
