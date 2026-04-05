AFRAME.registerComponent('ocean-texture', {
  dependencies: ['ocean'],
  init: function () {
    const el = this.el;
    
    el.addEventListener('object3dset', () => {
      const mesh = el.getObject3D('mesh');
      if (mesh) {
        const loader = new THREE.TextureLoader();
        
        // 1. Create a high-quality Standard Material
        const newMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color('#5e8784'),
          transparent: true,
          opacity: 0.95,
          roughness: 0.1,  // Makes it shiny
          metalness: 0.5   // Adds reflective "weight"
        });

        // 2. Load and apply the Normal Map
        loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', (texture) => {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(10, 10);
          newMaterial.normalMap = texture;
          newMaterial.needsUpdate = true;
        });

        // 3. Replace the ocean's default simple material with our realistic one
        mesh.material = newMaterial;
      }
    });
  },
  
  // Optional: Make the ripples drift slowly
  tick: function (t) {
    const mesh = this.el.getObject3D('mesh');
    if (mesh && mesh.material.normalMap) {
      mesh.material.normalMap.offset.x += 0.00005;
      mesh.material.normalMap.offset.y += 0.00005;
    }
  }
});