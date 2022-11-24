/*
 * @Description: 完善的computed
 * @Author: Sunly
 * @Date: 2022-11-22 13:44:40
 */
let activeEffect;
const effectStock = [];
function effect(fn, opt = {}) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    effectStock.push(effectFn);
    const res = fn();
    console.log("effect执行了");
    effectStock.pop();
    activeEffect = effectStock[effectStock.length - 1];
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
  effectFn.deps.forEach((deps) => {
    deps.delete(effectFn);
  });
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

function computed(getter) {
  let value;
  let dirty = true;
  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      if (!dirty) {
        dirty = true;
        trigger(obj, "value");
      }
    },
  });
  const obj = {
    get value() {
      if (dirty) {
        value = effectFn();
        dirty = false;
      }
      track(obj, "value");
      return value;
    },
  };
  return obj;
}

// 带缓存的computed
// 触发更新的effect会在调用computed的get value时被调用
// 在出发getter之前，使用dirty拦截，如果没有更新就不触发直接返回缓存值
// 将dirty重置为脏的操作放在scheduler中，也就是当代理对象的set触发时，不执行effect（因为没必要，computed是在getter时才实时计算，而且getter已经保存在computed中），而是执行scheduler将dirty置为脏
const sum = computed(() => obj.foo + obj.bar);
console.log(sum.value);
obj.foo++; // 执行
// console.log(sum.value);
// console.log(sum.value);
// console.log(sum.value);
// obj.bar++; // 执行
// console.log(sum.value);
// console.log(sum.value);
// console.log("---");

// 如果不做处理，建立的关系是原本proxy对象的foo/bar和这里console.log(sum.value)的关系
// 然后在修改值的时候，因为是懒执行的，所以执行了调度函数，将dirty设置为脏，但是不执行effect函数
// 所以修改不会触发响应式
// 所以我们需要在computed内getter获取值的时候，手动track(obj, 'value')
// 设置值时触发的scheduler里，手动触发trigger(obj, 'value')

effect(() => {
  console.log(sum.value);
});
obj.foo++;
