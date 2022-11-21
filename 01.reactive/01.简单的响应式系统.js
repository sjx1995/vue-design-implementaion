/*
 * @Description: 简单的响应式
 * @Author: Sunly
 * @Date: 2022-11-21 02:38:16
 */
function effect() {
  console.log("副作用函数触发了", obj.text);
}

// proxy实现响应式
const bucket = new Set();
const data = { text: "hello world" };
const obj = new Proxy(data, {
  get(target, key) {
    console.log("读取了");
    bucket.add(effect);
    return target[key];
  },
  set(target, key, newVal) {
    console.log("设置了");
    target[key] = newVal;
    bucket.forEach((fn) => fn());
    return true;
  },
});

effect();

setTimeout(() => {
  obj.text = "reactive";
}, 2000);

// 这里的问题是，使用了effect硬编码副作用函数
