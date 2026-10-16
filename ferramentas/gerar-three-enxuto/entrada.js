/* Entrada do bundle enxuto do three.js.
   Reexporta SÓ o que o site usa (heroi3d.js, mundo3d.js e os dois addons).
   Se um novo símbolo do three entrar no código, adicione aqui e regenere. */
export {
  // núcleo de render e cena
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Sprite, InstancedMesh, Object3D,
  // luzes e ambiente
  DirectionalLight, PointLight, PMREMGenerator, Fog, Color,
  // materiais
  MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, MeshLambertMaterial,
  SpriteMaterial, ShaderMaterial,
  // geometrias
  BoxGeometry, CylinderGeometry, SphereGeometry, PlaneGeometry, ConeGeometry,
  ExtrudeGeometry, Shape, Path, BufferGeometry, BufferAttribute,
  // texturas e constantes
  CanvasTexture, SRGBColorSpace, NeutralToneMapping, AdditiveBlending, BackSide,
  // matemática
  Matrix4, Euler, Vector2, Vector3, Quaternion, Raycaster, MathUtils,
} from 'three';
