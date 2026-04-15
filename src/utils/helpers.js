function enableShadows(model, excludeList = []) {
  model.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.receiveShadow = true;
    if (excludeList.includes(obj.name)) return;
    obj.castShadow = true;
  });
}

export { enableShadows };