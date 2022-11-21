/*
 * @Description: 完善的响应式系统
 * @Author: Sunly
 * @Date: 2022-11-21 02:53:55
 */
// 保存当前副作用函数的全局变量
let activeEffect;
// 注册当前副作用函数的函数
function effect(fn) {
  activeEffect = fn;
  fn();
}

const data = { text: "hello world" };
// proxy实现响应式
const bucket = new Set();
const obj = new Proxy(data, {
  get(target, key) {
    if (activeEffect) {
      console.log("get触发，注册副作用函数:", activeEffect);
      bucket.add(activeEffect);
    }
    return target[key];
  },
  set(target, key, newVal) {
    target[key] = newVal;
    console.log("set触发，触发所有收集的副作用函数");
    bucket.forEach((fn) => fn());
    return true;
  },
});

// 测试
// 注册副作用函数
effect(() => {
  console.log("副作用函数触发了", obj.text);
});
setTimeout(() => {
  obj.text = "reactive";
}, 1000);

// 问题：我们设置一个obj上面不存在的属性会怎么样
setTimeout(() => {
  obj.age = 18;
}, 2000);
// 副作用函数并没有读取obj.age，但是当我们设置这个不存在的属性时，副作用函数还是会执行
// 因为我们没有在对象属性和副作用函数之间建立关系，而是针对对象本身拦截了get和set操作，导致无论读取哪个属性都会收集到桶里；无论设置哪个属性都会触发桶里的函数
