import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';

const StlViewer = ({ stlFile, colorPalette }) => {
  const mountRef = useRef(null);
  const [error, setError] = useState(null);
  const [lodLevel, setLodLevel] = useState(0);

  useEffect(() => {
    if (!mountRef.current || !stlFile) return;

    let scene, camera, renderer, controls, mesh;
    let lowResGeometry, mediumResGeometry, highResGeometry;

    const createLowResGeometry = (geometry) => {
      const modifier = new SimplifyModifier();
      const count = Math.floor(geometry.attributes.position.count * 0.25);
      return modifier.modify(geometry, Math.max(count, 1));
    };

    const createMediumResGeometry = (geometry) => {
      const modifier = new SimplifyModifier();
      const count = Math.floor(geometry.attributes.position.count * 0.5);
      return modifier.modify(geometry, Math.max(count, 1));
    };

    try {
      // Scene setup
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);

      // Camera setup
      const aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);

      // Renderer setup
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      mountRef.current.appendChild(renderer.domElement);

      // Controls setup
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.screenSpacePanning = false;

      // Lighting setup
      const ambientLight = new THREE.AmbientLight(0x404040);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      // Add AxesHelper
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);

      // STL loading
      const loader = new STLLoader();
      loader.load(
        stlFile,
        (geometry) => {
          // Create different LOD levels
          highResGeometry = geometry;
          mediumResGeometry = createMediumResGeometry(geometry);
          lowResGeometry = createLowResGeometry(geometry);

          // Start with low resolution
          let currentGeometry = lowResGeometry;

          // Ensure bounding box and bounding sphere are computed
          currentGeometry.computeBoundingBox();
          currentGeometry.computeBoundingSphere();

          // Ensure normals are computed correctly
          currentGeometry.computeVertexNormals();

          // Apply transformations
          const matrix = new THREE.Matrix4();
          matrix.makeRotationZ(-Math.PI); // Rotate 180 degrees around Z-axis
          currentGeometry.applyMatrix4(matrix);

          matrix.makeRotationX(-Math.PI / 2); // Rotate 90 degrees around X-axis
          currentGeometry.applyMatrix4(matrix);

          const objectWidth = currentGeometry.boundingBox.max.x - currentGeometry.boundingBox.min.x;
          matrix.makeTranslation(objectWidth, 0, 0);
          currentGeometry.applyMatrix4(matrix);

          // Update bounding box and sphere after transformations
          currentGeometry.computeBoundingBox();
          currentGeometry.computeBoundingSphere();

          // Custom shader material
          const colors = colorPalette.reduce(
            (acc, cur, i) => ({
              ...acc,
              [`color${i + 1}`]: { value: new THREE.Color(parseInt(cur.slice(1), 16)) },
            }),
            {}
          );

          const layerColorFunc = `
            vec3 getLayerColor(float t) {
              ${colorPalette.map((_, i) => 
                i === 0 ? `if (t < ${(i + 1) / colorPalette.length}) return color1;` :
                i === colorPalette.length - 1 ? `return color${i + 1};` :
                `else if (t < ${(i + 1) / colorPalette.length}) return color${i + 1};`
              ).join('\n')}
            }
          `;

          const customMaterial = new THREE.ShaderMaterial({
            uniforms: {
              ...colors,
              minY: { value: currentGeometry.boundingBox.min.y },
              maxY: { value: currentGeometry.boundingBox.max.y },
            },
            vertexShader: `
              varying vec3 vPosition;
              varying vec3 vNormal;
              void main() {
                vPosition = position;
                vNormal = normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              ${Object.keys(colors).map(color => `uniform vec3 ${color};`).join('\n')}
              uniform float minY;
              uniform float maxY;
              varying vec3 vPosition;
              varying vec3 vNormal;
              ${layerColorFunc}
              void main() {
                float t = (vPosition.y - minY) / (maxY - minY);
                vec3 color = getLayerColor(t);
                
                // Basic lighting calculation
                vec3 light = normalize(vec3(1.0, 1.0, 1.0));
                float dProd = max(0.0, dot(vNormal, light));
                
                gl_FragColor = vec4(color * (0.5 + 0.5 * dProd), 1.0);
              }
            `,
            side: THREE.DoubleSide, // Render both sides of each face
          });

          mesh = new THREE.Mesh(currentGeometry, customMaterial);
          scene.add(mesh);

          // Use bounding sphere for camera positioning
          const { radius, center } = currentGeometry.boundingSphere;

          // Position camera to fit the object
          const distanceToFit = radius * 3;
          camera.position.set(distanceToFit, distanceToFit, distanceToFit);
          camera.lookAt(center);

          // Set controls target to center of the model
          controls.target.copy(center);

          // Set camera near and far planes based on model size
          camera.near = radius / 100;
          camera.far = radius * 100;
          camera.updateProjectionMatrix();

          controls.maxDistance = distanceToFit * 10;
          controls.minDistance = distanceToFit * 0.5;

          // Scale AxesHelper based on model size
          axesHelper.scale.setScalar(radius);

          controls.update();

          // Progressive LOD
          setTimeout(() => {
            mesh.geometry = mediumResGeometry;
            setLodLevel(1);
          }, 1000);

          setTimeout(() => {
            mesh.geometry = highResGeometry;
            setLodLevel(2);
          }, 2000);
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        },
        (error) => {
          console.error("Error loading STL:", error);
          setError(`Failed to load STL file: ${error.message}`);
        }
      );

      // Animation loop
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Handle window resize
      const handleResize = () => {
        if (mountRef.current) {
          const width = mountRef.current.clientWidth;
          const height = mountRef.current.clientHeight;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      };
      window.addEventListener("resize", handleResize);

      // Store the current value of mountRef in a variable
      const currentMount = mountRef.current;

      // Cleanup
      return () => {
        window.removeEventListener("resize", handleResize);
        if (currentMount) {
          currentMount.removeChild(renderer.domElement);
        }
        if (mesh) {
          scene.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.dispose();
        }
        if (renderer) {
          renderer.dispose();
        }
      };
    } catch (err) {
      console.error("Error in STL viewer:", err);
      setError(`Failed to load STL file: ${err.message}`);
    }
  }, [colorPalette, stlFile]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <div ref={mountRef} style={{ width: "100%", height: "400px" }} />
      <p>LOD Level: {lodLevel}</p>
    </div>
  );
};

export default StlViewer;