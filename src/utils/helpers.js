function enableShadows(model, excludeList = []) {
  // Helper function to enable shadows excluding some elements of the model
  model.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.receiveShadow = true;
    if (excludeList.includes(obj.name)) return;
    obj.castShadow = true;
  });
}

export { enableShadows };