import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const StlViewer = ({ stlFile, colorPalette, baseHeight, layerHeight }) => {
  const mountRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mountRef.current || !stlFile) return;

    let scene, camera, renderer, controls, mesh;

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
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
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
          // Ensure bounding box and bounding sphere are computed
          geometry.computeBoundingBox();
          geometry.computeBoundingSphere();

          // Ensure normals are computed correctly
          geometry.computeVertexNormals();

          // Apply transformations
          const matrix = new THREE.Matrix4();
          matrix.makeRotationX(-Math.PI / 2); // Rotate 90 degrees around X-axis
          geometry.applyMatrix4(matrix);

          // Custom shader material
          const colors = colorPalette.reduce(
            (acc, cur, i) => ({
              ...acc,
              [`color${i + 1}`]: { value: new THREE.Color(parseInt(cur.slice(1), 16)) },
            }),
            {}
          );

          const layerColorFunc = `
            vec3 getLayerColor(float height) {
              if (height <= baseHeight) return color1;
              float layerIndex = floor((height - baseHeight) / layerHeight);
              int colorIndex = int(min(layerIndex, ${colorPalette.length - 1}.0)) + 1;
              
              ${colorPalette.map((_, i) => 
                i === 0 ? `if (colorIndex == 1) return color1;` :
                i === colorPalette.length - 1 ? `return color${i + 1};` :
                `else if (colorIndex == ${i + 1}) return color${i + 1};`
              ).join('\n')}
              return color${colorPalette.length}; // Return the last color for all higher layers
            }
          `;

          const customMaterial = new THREE.ShaderMaterial({
            uniforms: {
              ...colors,
              baseHeight: { value: baseHeight },
              layerHeight: { value: layerHeight },
              minY: { value: geometry.boundingBox.min.y },
              maxY: { value: geometry.boundingBox.max.y },
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
              uniform float baseHeight;
              uniform float layerHeight;
              uniform float minY;
              uniform float maxY;
              varying vec3 vPosition;
              varying vec3 vNormal;
              ${layerColorFunc}
              void main() {
                float height = vPosition.y - minY;
                vec3 color = getLayerColor(height);
                
                // Improved lighting calculation
                vec3 light = normalize(vec3(1.0, 1.0, 1.0));
                float dProd = max(0.3, dot(vNormal, light));
                
                // Ambient light
                vec3 ambient = 0.4 * color;
                
                // Diffuse light
                vec3 diffuse = 0.6 * dProd * color;
                
                // Combine lighting
                vec3 finalColor = ambient + diffuse;
                
                gl_FragColor = vec4(finalColor, 1.0);
              }
            `,
            side: THREE.DoubleSide, // Render both sides of each face
          });

          mesh = new THREE.Mesh(geometry, customMaterial);
          scene.add(mesh);

          // Use bounding sphere for camera positioning
          const { radius, center } = geometry.boundingSphere;

          // Position camera to fit the object
          const distanceToFit = radius * 2.5;
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
  }, [colorPalette, stlFile, baseHeight, layerHeight]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div ref={mountRef} style={{ width: "100%", height: "400px" }} />;
};

export default StlViewer;