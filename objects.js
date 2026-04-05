AFRAME.registerComponent('object-manager', {
  schema: {
    spawnInterval: { type: 'number', default: 3000 }, // Spawn every 3 seconds
    spawnRadius: { type: 'number', default: 15 }      // How far away they appear
  },

  init: function () {
    this.spawnTimer = 0;
    this.sceneEl = this.el.sceneEl;

    // Spawn the platform and basket
    this.spawnWorldTools();
  },

  tick: function (time, timeDelta) {
    this.spawnTimer += timeDelta;

    if (this.spawnTimer >= this.data.spawnInterval) {
      this.spawnObject();
      this.spawnTimer = 0;
    }
  },

  spawnWorldTools: function () {
    // Create Platform
    const platform = document.createElement('a-entity');
    platform.setAttribute('id', 'platform');
    platform.setAttribute('gltf-model', '#platform-model');
    platform.setAttribute('position', '-25 0.1 26.1');
    platform.setAttribute('rotation', '0 45 0');
    platform.setAttribute('scale', '0.03 0.03 0.03');
    platform.setAttribute('shadow', 'receive: true');
    this.sceneEl.appendChild(platform);
    
    const colFloor = document.createElement('a-box');
    colFloor.setAttribute('id', 'platform-collision');
    
    // Real-world meters (no more 0.03 math!)
    colFloor.setAttribute('width', '5.910');  
    colFloor.setAttribute('height', '1');
    colFloor.setAttribute('depth', '5.910');
    
    // Match the platform's position and rotation exactly
    colFloor.setAttribute('position', '-25 -0.05 26.1'); 
    colFloor.setAttribute('rotation', '0 45 0'); 

    // Physics
    colFloor.setAttribute('static-body', '');

    // Material for visibility
    colFloor.setAttribute('material', {
      color: '#222222',
      transparent: true,
      opacity: 0.5,
      visible: true
    });

    // --- UI Logic START ---
    colFloor.addEventListener('collide', (e) => {
      const collidedEl = e.detail.body.el;

      if (collidedEl && collidedEl.classList.contains('interactable') && !collidedEl.dataset.scored) {
        collidedEl.dataset.scored = "true";

        // 1. Identify item type
        const geom = collidedEl.getAttribute('geometry');
        const itemType = (geom && geom.primitive === 'box') ? 'box' : 'sphere';

        // 2. CALL UI MANAGER DIRECTLY
        const uiEl = document.querySelector('#goal-panel');
        if (uiEl && uiEl.components['progress-ui']) {
          uiEl.components['progress-ui'].recordScore(itemType);
        }

        console.log(`Directly reported ${itemType} to UI.`);
      }
    });
    // --- UI Logic END ---

    // Add directly to the scene, NOT the platform
    this.sceneEl.appendChild(colFloor);

    // --- TEMPORARY TEST BOX ---
    // const testBox = document.createElement('a-box');
    // testBox.setAttribute('width', '0.2');
    // testBox.setAttribute('height', '0.2');
    // testBox.setAttribute('depth', '0.2');
    // testBox.setAttribute('color', 'red');

    // // Position it exactly above the basket's start position
    // // We'll put it at Y=10 so it has a nice long fall into the basket
    // testBox.setAttribute('position', '-24 10 26.6'); 

    // // Standard physics - no drift components yet
    // testBox.setAttribute('dynamic-body', 'mass: 1; shape: box;');

    // this.sceneEl.appendChild(testBox);
    // --------------------------
  },

  spawnObject: function () {
    const rigEl = document.querySelector('#rig');
    const rigPos = rigEl.getAttribute('position') || {x: 0, y: 0, z: 0};

    const objectTypes = [
      { type: 'a-sphere', radius: 0.3, color: '#a2d2ff' },
      { type: 'a-box', width: 0.4, height: 0.4, depth: 0.4, color: '#28a89b' },
    ];

    // Pick random object from the available objects list
    const config = objectTypes[Math.floor(Math.random() * objectTypes.length)];
    const object = document.createElement(config.type);
    const physicsShape = config.type === 'a-sphere' ? 'sphere' : 'box';

    for (let attribute in config) {
      if (attribute !== 'type') object.setAttribute(attribute, config[attribute]);
    }
    
    const angle = Math.random() * Math.PI * 2; // Spawn circle
    const x = Math.cos(angle) * this.data.spawnRadius;
    const z = Math.sin(angle) * this.data.spawnRadius;
    const y = Math.random() * 2 + 2; // Spawn atleast +2 meter above player head 

    // Offset with which the object floats past the intitial player position
    const offsetMin = 0.1; 
    const offsetMax = 1; // Offset not greater than 1 meter, but always atleast 1 meter off 'rigPos'

    // Will generate a positive or negative offset based on the set offset values
    const generateOffset = () => (Math.random() * offsetMax + offsetMin) * (Math.random() < 0.5 ? 1 : -1);

    object.setAttribute('class', 'interactable');
    object.setAttribute('position', { x: rigPos.x + x, y: rigPos.y + y, z: rigPos.z + z });
    object.setAttribute('opacity', '0.8');
    object.setAttribute('dynamic-body', {
      shape: physicsShape,
      mass: 1,
      angularDamping: 0.8,
      gravity: 0
    });
    
    if (config.type !== 'a-sphere') {
      object.setAttribute('slow-spin', { speed: 0.3 });
    }
    
    // Apply the new drift component instead of 'animation'
    object.setAttribute('physics-drift', {
      target: {
        x: rigPos.x + generateOffset(), 
        y: y, 
        z: rigPos.z + generateOffset() 
      },
      speed: 0.5
    });

    object.setAttribute('grabbable', '');
    object.setAttribute('pop-on-click', '');

    this.sceneEl.appendChild(object);

    setTimeout(() => {
      if (object.parentNode) {
        object.parentNode.removeChild(object);
      }
    }, 90000);
  }
});

AFRAME.registerComponent('physics-drift', {
  schema: {
    target: {type: 'vec3'},
    speed: {type: 'number', default: 1}
  },

  init: function() {
    const el = this.el;
    const currentPos = el.getAttribute('position');
    const targetPos = this.data.target;

    this.initialY = currentPos.y;
    this.isInteracting = false; // Flag to track if the user is holding it

    this.direction = new THREE.Vector3(
      targetPos.x - currentPos.x,
      0,
      targetPos.z - currentPos.z
    ).normalize();

    // LISTENERS: Detect when the user interacts
    el.addEventListener('grab-start', () => {
      this.isInteracting = true;
      // Optional: Give it gravity once touched so it feels "real"
      if (el.body) el.body.mass = 1; 
    });

    el.addEventListener('grab-end', () => {
      // Once dropped, we stop the drift forever so it can stay on the platform
      this.isInteracting = true; // Keep it "true" to stay disabled, or remove the component
      this.el.removeAttribute('physics-drift');
    });
  },

  tick: function (time, timeDelta) {
    const el = this.el;
    const body = el.body;

    // If the user is holding it, or it was just dropped, stop the drift logic
    if (!body || !this.direction || this.isInteracting) return;

    body.velocity.set(
      this.direction.x * this.data.speed,
      0, 
      this.direction.z * this.data.speed
    );

    // This was the "invisible string" holding it up. 
    // We only do this while it hasn't been touched yet.
    body.position.y = this.initialY;
  }
});

AFRAME.registerComponent('slow-spin', {
  schema: {
    speed: { type: 'number', default: 1 } // Multiplier for the spin
  },

  init: function() {
    // Randomize speeds so they don't all look identical
    this.baseSpeedY = (Math.random() * 0.02 + 0.01) * this.data.speed;
    this.baseSpeedX = (Math.random() * 0.01) * this.data.speed;
  },

  tick: function(t, dt) {
    this.el.object3D.rotation.y += this.baseSpeedY;
    this.el.object3D.rotation.x += this.baseSpeedX;

    if (this.el.body) {
      this.el.body.quaternion.copy(this.el.object3D.quaternion);
    }
  }
});

// OBJECT GRAB LOGIC 
AFRAME.registerComponent("point-beam", {
  schema: {
    minDistance: { type: 'number', default: 1.0 },
    lerpSpeed: { type: 'number', default: 0.05 }
  },

  init: function () {
    this.grabbedEl = null;
    this.hitDistance = 0;
    this.rayOrigin = new THREE.Vector3();
    this.rayDir = new THREE.Vector3();

    const startGrab = (evt) => {

      const raycaster = this.el.components.raycaster;
      const intersections = raycaster ? raycaster.intersections : [];
      
      // Look for the first interactable hit
      const hit = intersections.find(i => i.object.el.classList.contains('interactable'));

      if (hit) {
        this.grabbedEl = hit.object.el;
        this.hitDistance = hit.distance;

        this.grabbedEl.removeAttribute('physics-drift');
        this.grabbedEl.removeAttribute('slow-spin');

        if (this.grabbedEl.body) {
          this.grabbedEl.body.mass = 0;
          this.grabbedEl.body.velocity.set(0, 0, 0);
          this.grabbedEl.body.updateMassProperties();
        }
      }
    };

    const endGrab = () => {
      if (this.grabbedEl) {
        if (this.grabbedEl.body) {
          this.grabbedEl.body.mass = 1;
          this.grabbedEl.body.updateMassProperties();
          this.grabbedEl.body.velocity.set(0, 0, 0);
        }
        this.grabbedEl = null;
      }
    };

    // --- EVENT LISTENERS ---
    
    // VR Controller Listeners
    this.el.addEventListener("triggerdown", startGrab);
    this.el.addEventListener("triggerup", endGrab);

    // Mouse Listeners (Supported by A-Frame's cursor component)
    this.el.addEventListener("mousedown", startGrab);
    this.el.addEventListener("mouseup", endGrab);
  },

  tick: function (time, timeDelta) {
    if (!this.grabbedEl) return;

    const raycasterComponent = this.el.components.raycaster;
    if (!raycasterComponent || !raycasterComponent.raycaster) return;

    // 1. CALCULATE GENTLE SPEED CURVE
    const distanceGap = this.hitDistance - this.data.minDistance;

    if (distanceGap > 0.01) {
      const baseSpeed = 1.5; 
      const boost = Math.sqrt(Math.max(1, this.hitDistance));
      const frameSpeed = (baseSpeed * boost) * (timeDelta / 1000);
      const easeOut = Math.min(1, distanceGap); 
      this.hitDistance -= frameSpeed * easeOut;
    } else {
      this.hitDistance = this.data.minDistance;
    }

    // 2. POSITION CALCULATION
    const ray = raycasterComponent.raycaster.ray;
    const targetPos = new THREE.Vector3()
      .copy(ray.direction)
      .multiplyScalar(this.hitDistance)
      .add(ray.origin);

    // 3. APPLY
    this.grabbedEl.object3D.position.copy(targetPos);
    if (this.grabbedEl.body) {
      this.grabbedEl.body.position.copy(targetPos);
      this.grabbedEl.body.velocity.set(0, 0, 0);
      this.grabbedEl.body.angularVelocity.set(0, 0, 0);
    }
  }
});