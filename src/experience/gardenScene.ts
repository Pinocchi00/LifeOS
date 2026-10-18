import * as THREE from "three";
import type { GardenScope } from "../domain/garden";
type Options = {
  scope: GardenScope;
  calm: boolean;
  select: (scope: GardenScope) => void;
  unavailable: () => void;
};
export function createGarden(host: HTMLElement, options: Options) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!context) throw new Error("Relief unavailable");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.touchAction = "pan-y";
  host.append(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3.2, 3.2, 3.2, -3.2, 0.1, 60);
  scene.add(new THREE.HemisphereLight(0xeef1d4, 0x273a2a, 2.2));
  const sun = new THREE.DirectionalLight(0xffecd1, 3.1);
  sun.position.set(-3, 7, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -5;
  sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 5;
  sun.shadow.camera.bottom = -5;
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 128;
  textureCanvas.height = 128;
  const paint = textureCanvas.getContext("2d")!;
  paint.fillStyle = "#c1bfb0";
  paint.fillRect(0, 0, 128, 128);
  let seed = 9;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 900; i++) {
    paint.fillStyle = random() > 0.5 ? "#a7a99a" : "#d0cebf";
    paint.globalAlpha = 0.22 + random() * 0.22;
    paint.fillRect(
      random() * 128,
      random() * 128,
      random() * 2 + 0.4,
      random() * 2 + 0.4,
    );
  }
  paint.globalAlpha = 0.2;
  paint.strokeStyle = "#747c6b";
  for (let i = 0; i < 128; i += 21) {
    paint.beginPath();
    paint.moveTo(0, i);
    paint.lineTo(128, i);
    paint.stroke();
  }
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  const concrete = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xbec5b2,
    roughness: 0.96,
  });
  const darkConcrete = new THREE.MeshStandardMaterial({
    map: texture,
    color: 0x7b8b72,
    roughness: 1,
  });
  const soil = new THREE.MeshStandardMaterial({
    color: 0x344432,
    roughness: 1,
  });
  const box = new THREE.BoxGeometry(1, 1, 1);
  const stemsGeometry = new THREE.CylinderGeometry(0.012, 0.02, 1, 5);
  const stemMaterial = new THREE.MeshStandardMaterial({
    color: 0x566e3d,
    roughness: 1,
  });
  const leafGeometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    const width = Math.sin(t * Math.PI) * 0.28;
    positions.push(
      -width,
      t,
      Math.sin(t * Math.PI) * 0.13,
      width,
      t,
      Math.sin(t * Math.PI) * 0.13,
    );
    if (i < 5) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  leafGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  leafGeometry.setIndex(indices);
  leafGeometry.computeVertexNormals();
  const foliage = new THREE.MeshStandardMaterial({
    color: 0x718b3d,
    side: THREE.DoubleSide,
    roughness: 0.83,
  });
  const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.32 });
  const groundGeometry = new THREE.PlaneGeometry(25, 25);
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.13;
  ground.receiveShadow = true;
  scene.add(ground);
  const scopes: GardenScope[] = ["day", "projects", "assistants"];
  const groups: THREE.Group[] = [];
  const accents: THREE.MeshStandardMaterial[] = [];
  const pickable: THREE.Mesh[] = [];
  const instance = new THREE.Object3D();
  function solid(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(box, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    mesh.castShadow = material === concrete || material === darkConcrete;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
  scopes.forEach((scope, index) => {
    const group = new THREE.Group();
    group.position.set((index - 1) * 1.65, index * 0.38, index * -0.7);
    group.userData.scope = scope;
    scene.add(group);
    groups.push(group);
    const height = 0.47 + index * 0.38;
    const base = solid(
      group,
      0,
      0.21 - height / 2,
      0,
      1.56,
      height,
      1.5,
      concrete,
    );
    base.userData.scope = scope;
    pickable.push(base);
    solid(group, 0, -height + 0.24, 0, 1.6, 0.08, 1.54, darkConcrete);
    solid(group, 0, 0.24, -0.45, 1.35, 0.23, 0.45, concrete);
    solid(group, 0, 0.365, -0.45, 1.2, 0.025, 0.32, soil);
    const accent = new THREE.MeshStandardMaterial({
      color: 0xa1b875,
      roughness: 0.55,
      emissive: 0x304421,
      emissiveIntensity: 0.15,
    });
    accents.push(accent);
    const step = solid(group, 0, 0.225, 0.47, 1.05, 0.045, 0.32, accent);
    step.userData.scope = scope;
    pickable.push(step);
    const face = solid(group, 0, 0.05, 0.76, 1.3, 0.21, 0.02, concrete);
    face.userData.scope = scope;
    face.castShadow = false;
    pickable.push(face);
    const stems = new THREE.InstancedMesh(stemsGeometry, stemMaterial, 7);
    const leaves = new THREE.InstancedMesh(leafGeometry, foliage, 54);
    for (let i = 0; i < 7; i++) {
      const x = (random() - 0.5) * 1.04,
        z = -0.5 + (random() - 0.5) * 0.17;
      const height = 0.48 + random() * 0.65;
      instance.position.set(x, 0.36 + height / 2, z);
      instance.rotation.set(0, 0, (random() - 0.5) * 0.25);
      instance.scale.set(1, height, 1);
      instance.updateMatrix();
      stems.setMatrixAt(i, instance.matrix);
      for (let j = 0; j < 6; j++) {
        const angle = (j * Math.PI) / 3 + random() * 0.5;
        instance.position.set(x, 0.5 + (height * j) / 7, z);
        instance.rotation.set(
          0.7 + random() * 0.7,
          angle,
          (random() - 0.5) * 0.6,
        );
        const size = 0.32 + random() * 0.38;
        instance.scale.set(size, size, size);
        instance.updateMatrix();
        leaves.setMatrixAt(i * 6 + j, instance.matrix);
        leaves.setColorAt(
          i * 6 + j,
          new THREE.Color().setHSL(
            0.2 + random() * 0.07,
            0.32 + random() * 0.18,
            0.2 + random() * 0.17,
          ),
        );
      }
    }
    for (let j = 0; j < 12; j++) {
      instance.position.set((random() - 0.5) * 1.3, 0.23, 0.74);
      instance.rotation.set(
        0.15,
        random() * 0.5,
        Math.PI + (random() - 0.5) * 0.6,
      );
      const size = 0.24 + random() * 0.45;
      instance.scale.set(size, size, size);
      instance.updateMatrix();
      leaves.setMatrixAt(42 + j, instance.matrix);
      leaves.setColorAt(
        42 + j,
        new THREE.Color().setHSL(0.22, 0.4, 0.23 + random() * 0.12),
      );
    }
    stems.castShadow = false;
    leaves.castShadow = true;
    group.add(stems, leaves);
    if (index === 2) {
      solid(group, -0.61, 0.9, -0.68, 0.18, 1.35, 0.18, concrete);
      solid(group, 0.61, 0.9, -0.68, 0.18, 1.35, 0.18, concrete);
      solid(group, 0, 1.57, -0.68, 1.4, 0.2, 0.25, concrete);
    }
  });
  let selected = options.scope;
  let disposed = false;
  let visible = true;
  let frame = 0;
  let until = 0;
  let rotation = 0;
  let targetRotation = 0;
  let tilt = 0;
  let targetTilt = 0;
  let entrance = options.calm ? 1 : 0;
  let last = 0;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const fine = matchMedia("(pointer:fine)").matches;
  function render(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = last ? Math.min(40, now - last) : 16;
    last = now;
    const blend = options.calm ? 1 : 1 - Math.exp(-dt / 85);
    rotation += (targetRotation - rotation) * blend;
    tilt += (targetTilt - tilt) * blend;
    entrance = Math.min(1, entrance + dt / 700);
    camera.position.set(
      6 * Math.sin(0.72 + rotation),
      4.7 + tilt,
      6 * Math.cos(0.72 + rotation),
    );
    camera.lookAt(0, 0.65, 0);
    let moving =
      entrance < 1 ||
      Math.abs(targetRotation - rotation) > 0.001 ||
      Math.abs(targetTilt - tilt) > 0.001;
    groups.forEach((group, index) => {
      const target =
        index * 0.38 +
        (selected === scopes[index] ? 0.16 : 0) -
        (1 - entrance) * 0.25;
      group.position.y += (target - group.position.y) * blend;
      if (Math.abs(target - group.position.y) > 0.002) moving = true;
      accents[index].emissiveIntensity =
        selected === scopes[index] ? 0.65 : 0.08;
    });
    renderer.render(scene, camera);
    host.dataset.frames = String(Number(host.dataset.frames ?? 0) + 1);
    host.dataset.drawCalls = String(renderer.info.render.calls);
    if (!options.calm && (moving || now < until))
      frame = requestAnimationFrame(render);
  }
  function request(duration = 0) {
    if (disposed) return;
    until = performance.now() + duration;
    if (!frame && visible && !document.hidden)
      frame = requestAnimationFrame(render);
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (width < 1 || height < 1) return;
    const aspect = width / height;
    const extent = 2.9 / Math.min(1, aspect / 1.2);
    camera.left = -extent * aspect;
    camera.right = extent * aspect;
    camera.top = extent;
    camera.bottom = -extent;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    request();
  }
  function hit(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(pickable, false)[0]?.object.userData
      .scope as GardenScope | undefined;
  }
  const move = (event: PointerEvent) => {
    if (!fine || options.calm) return;
    const rect = canvas.getBoundingClientRect();
    targetRotation = ((event.clientX - rect.left) / rect.width - 0.5) * 0.34;
    targetTilt = ((event.clientY - rect.top) / rect.height - 0.5) * -0.55;
    canvas.style.cursor = hit(event) ? "pointer" : "default";
    request(80);
  };
  const leave = () => {
    targetRotation = 0;
    targetTilt = 0;
    request(100);
  };
  let down: { x: number; y: number } | null = null;
  const start = (event: PointerEvent) => {
    down = { x: event.clientX, y: event.clientY };
  };
  const end = (event: PointerEvent) => {
    if (
      down &&
      Math.hypot(event.clientX - down.x, event.clientY - down.y) < 8
    ) {
      const scope = hit(event);
      if (scope) options.select(scope);
    }
    down = null;
  };
  const cancel = () => {
    down = null;
  };
  const lost = (event: Event) => {
    event.preventDefault();
    options.unavailable();
  };
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else request();
  };
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (visible) request();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    { threshold: 0 },
  );
  observer.observe(host);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("webglcontextlost", lost);
  document.addEventListener("visibilitychange", visibility);
  resize();
  request(750);
  return {
    setScope(scope: GardenScope) {
      selected = scope;
      request(400);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("pointerdown", start);
      canvas.removeEventListener("pointerup", end);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", visibility);
      [box, stemsGeometry, leafGeometry, groundGeometry].forEach((geometry) =>
        geometry.dispose(),
      );
      [
        concrete,
        darkConcrete,
        soil,
        stemMaterial,
        foliage,
        groundMaterial,
        ...accents,
      ].forEach((material) => material.dispose());
      texture.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
